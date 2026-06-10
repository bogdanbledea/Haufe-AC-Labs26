import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { llm, MODEL, PROVIDER, sysMsg } from './llm.js';
import { logger } from './logger.js';

const INTERNAL_SECRET = process.env.SMO_AI_SECRET;
if (!INTERNAL_SECRET) {
  console.error('SMO_AI_SECRET is not set — all non-health requests will be rejected');
}

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan(':method :url :status :res[content-length] bytes - :response-time ms'));

// Reject requests that don't carry the shared secret.
// /health is exempt so Railway health checks keep working.
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!INTERNAL_SECRET || req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

const PORT = process.env.PORT || 3100;

// --- Per-IP rate limiter ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Slow down — 30 requests per minute per IP.' },
});
app.use(limiter);

// --- Groq circuit breaker ---
let rateLimitedUntil = 0;

function isRateLimited() {
  return Date.now() < rateLimitedUntil;
}

function getRetryAfter() {
  return Math.ceil((rateLimitedUntil - Date.now()) / 1000);
}

function tripCircuitBreaker(retryAfterSeconds = 300) {
  rateLimitedUntil = Date.now() + retryAfterSeconds * 1000;
  logger.warn(`Groq rate limit hit — circuit open for ${retryAfterSeconds}s`);
}

function rateLimitedResponse(res) {
  return res.status(429).json({ rateLimited: true, retryAfter: getRetryAfter() });
}

// --- Prompts ---

const TAGS_SYSTEM_PROMPT = `You are a tagging assistant for Stack my Overflow, a Q&A platform for software developers.
Your only job is to suggest relevant tags for a developer question based on its title.

Rules:
- Return between 3 and 5 tags
- Tags must be lowercase
- Use hyphens instead of spaces (e.g. "react-hooks" not "react hooks")
- Tags should reflect the technology, language, concept, or framework the question is about
- Do not use generic tags like "question", "help", "issue", "problem", "error"
- Prefer specific tags over vague ones (e.g. "useEffect" over "react")
- Output ONLY valid JSON. Format: {"tags": ["tag1", "tag2", "tag3"]}`;

const SMART_SEARCH_SYSTEM_PROMPT = `You are a search expansion assistant for Stack my Overflow, a Q&A platform for software developers.

## Your role
A user typed a search query on the Home page. Your job is NOT to answer the question and NOT to return matching questions. You only expand the query into search keywords that a backend will use to find relevant questions in a database.

The backend searches question titles and descriptions with simple text matching (case-insensitive). It does not understand semantics on its own — your keywords are how related questions get surfaced.

## What you must infer
From the user's query, identify:
1. Topic — the technology, language, framework, or concept (e.g. JavaScript, CSS, SQL, React).
2. Intent — what the user is trying to do or understand (e.g. debug an error, learn a concept, compare approaches).
3. Related terms — synonyms, abbreviations, API names, and adjacent concepts a developer would use when asking the same thing in different words.

Example:
- Query: "how do I async javascript"
- Topic: asynchronous JavaScript
- Intent: learn how to handle async code
- Good keywords: async, await, promise, callback, event-loop, fetch, javascript, non-blocking

## What to compare mentally
Think: "If another developer asked the same thing on a Q&A site, what words might appear in the title or description?" Include those — not only words copied from the query.

## Output rules
- Return between 5 and 10 keywords
- All keywords must be lowercase
- Use hyphens for multi-word terms when natural (e.g. "event-loop", "async-await")
- Prefer specific technical terms over vague words
- Always include the most important words from the original query when they are meaningful
- Do NOT include generic filler: question, help, issue, problem, error, how, what, why, please, fix
- No duplicates or near-duplicates (e.g. do not return both "promise" and "promises")
- Output ONLY valid JSON in this exact format:
  {"keywords": ["keyword1", "keyword2", "keyword3"]}

## When the query is unclear
If the query is very short or vague, still return the best keywords you can. Include meaningful tokens from the query plus related technical terms. Do not return an empty list.`;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'this', 'that', 'these', 'those',
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'can', 'get', 'use', 'using',
  'question', 'help', 'issue', 'problem', 'error', 'please', 'fix', 'need', 'want',
]);

// --- Helpers ---

function sanitizeInput(text, maxLength = 300) {
  return text
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
}

function sanitizeTags(tags) {
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.toLowerCase().trim().replace(/\s+/g, '-'))
    .slice(0, 5);
}

function normalizeKeyword(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeKeywords(keywords) {
  const seen = new Set();
  const result = [];

  for (const item of keywords) {
    if (typeof item !== 'string') continue;
    const kw = normalizeKeyword(item);
    if (kw.length < 2 || STOP_WORDS.has(kw)) continue;
    if (seen.has(kw)) continue;
    seen.add(kw);
    result.push(kw);
    if (result.length >= 10) break;
  }

  return result;
}

function fallbackKeywordsFromQuery(query) {
  const tokens = query
    .toLowerCase()
    .split(/[\s,;!?./]+/)
    .map(normalizeKeyword)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  return [...new Set(tokens)].slice(0, 10);
}

function parseKeywordsFromContent(content) {
  if (!content?.trim()) return [];

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? content).trim();

  try {
    const parsed = JSON.parse(raw);
    return sanitizeKeywords(parsed.keywords ?? []);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        return sanitizeKeywords(parsed.keywords ?? []);
      } catch {
        const quoted = [...objectMatch[0].matchAll(/"([a-z][a-z0-9-]*)"/gi)].map((m) => m[1]);
        if (quoted.length > 0) return sanitizeKeywords(quoted);
      }
    }
    return [];
  }
}

function isGroq429(err) {
  return err?.status === 429 || err?.message?.includes('429');
}

// --- Routes ---

app.post('/tags', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(TAGS_SYSTEM_PROMPT),
        { role: 'user', content: `Question title: "${sanitizeInput(title)}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 100,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const tags = sanitizeTags(parsed.tags ?? []);
    return res.json({ tags });
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/tags failed', { error: err.message });
    return res.status(503).json({ tags: [], error: 'Tag service unavailable' });
  }
});

app.post('/smart-search', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'query is required (min 2 characters)' });
  }

  const cleanQuery = sanitizeInput(query, 200);

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(SMART_SEARCH_SYSTEM_PROMPT),
        { role: 'user', content: `Search query: "${cleanQuery}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    });

    let keywords = parseKeywordsFromContent(completion.choices[0].message.content);

    if (keywords.length === 0) {
      keywords = fallbackKeywordsFromQuery(cleanQuery);
    }

    const fallback = fallbackKeywordsFromQuery(cleanQuery);
    for (const kw of fallback) {
      if (!keywords.includes(kw)) keywords.push(kw);
      if (keywords.length >= 10) break;
    }

    return res.json({ keywords: keywords.slice(0, 10) });
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/smart-search failed', { error: err.message });
    return res.status(503).json({ keywords: [], error: 'Smart search unavailable' });
  }
});

app.get('/health', (_req, res) => {
  if (isRateLimited()) {
    return res.json({ ok: false, rateLimited: true, retryAfter: getRetryAfter(), provider: PROVIDER, model: MODEL });
  }
  return res.json({ ok: true, rateLimited: false, provider: PROVIDER, model: MODEL });
});

app.listen(PORT, () => {
  logger.info(`smo-ai running on port ${PORT}`);
  logger.info(`Provider: ${PROVIDER} | Model: ${MODEL}`);
});
