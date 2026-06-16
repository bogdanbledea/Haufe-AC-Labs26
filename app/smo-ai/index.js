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
 
const EVALUATE_ANSWER_SYSTEM_PROMPT = `You are a quality evaluator for Stack my Overflow, a Q&A platform for software developers.
Your job is to evaluate how well a developer's answer addresses the given question.

You will receive a Question and an Answer.

Rules:
- Return exactly one of three values: "helpful", "needs-detail", or "off-topic"
- "helpful": the answer is relevant to the question, clear, and addresses it well
- "needs-detail": the answer is on-topic but too vague, incomplete, or missing explanation
- "off-topic": the answer does not address THIS question — it's about something else entirely
- Output ONLY valid JSON. Format: {"badge": "helpful"}`;

const SUMMARY_SYSTEM_PROMPT = `You are an advanced technical summarization engine for "Stack my Overflow", a developer Q&A platform. Your task is to analyze a programming question and its top answer, extracting a highly accurate, noise-free summary.

### INPUT STRUCTURE
You will be provided with:
1. Question Title & Body (containing code snippets, errors, and context)
2. Top Answer (Optional)

### CRITICAL PROCESSING RULES
- NO FILLER TEXT: Do not use introductory phrases like "The user is asking...", "This thread is about...", or "The author explains...". Start immediately with the technical problem.
- TECHNICAL PRECISION: Maintain exact casing and naming for libraries, frameworks, API methods, and error codes (e.g., use "Node.js", not "node", "EADDRINUSE", not "port error").
- CONDITIONAL SOLUTION LOGIC: 
  - If a Top Answer is provided: Extract the core mechanism of the fix (e.g., "resolved by implementing a custom middleware to handle CORS").
  - If NO Top Answer is provided: Explicitly set the solution fields to null and focus entirely on diagnosing the root cause of the problem.
- STRICT TRUTH: Do not infer or hallucinate solutions if they are not explicitly present in the text.

### OUTPUT SPECIFICATION
- You must output EXACTLY a single, valid JSON object. 
- Do NOT wrap the JSON in markdown code blocks (e.g., do not use \`\`\`json ... \`\`\`).
- Ensure all inner strings properly escape double quotes to prevent JSON parsing failures.

### REQUIRED JSON SCHEMA
{
  "core_problem": "A concise, one-sentence distillation of the technical roadblock.",
  "technologies_involved": ["Array", "of", "tags", "languages", "or", "libraries", "detected"],
  "solution_approach": "A brief summary of the resolution mechanism, or null if no answer was provided.",
  "summary": "A cohesive, developer-friendly 1-2 sentence summary blending the problem and the solution seamlessly."
}`;

const SMART_SEARCH_SYSTEM_PROMPT = `You expand a developer's search query into related search keywords for Stack my Overflow, a Q&A platform for software developers.
The backend uses your keywords to find questions whose titles or descriptions mention any of them, so good coverage matters.

Rules:
- Return between 5 and 8 keywords
- Cover related concepts, synonyms, technologies, and APIs — NOT restatements of the query
- Example: "how do I async javascript" -> ["async", "await", "promises", "event loop", "callbacks", "settimeout", "fetch"]
- Single words or short phrases (max 3 words), lowercase
- No duplicates, no full sentences, no generic words like "how", "code", "help", "javascript" on its own if it's just echoing the query
- Output ONLY valid JSON. Format: {"keywords": ["term1", "term2", "term3"]}`;

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

function sanitizeKeywords(keywords) {
  const seen = new Set();
  const out = [];
  for (const k of keywords) {
    if (typeof k !== 'string') continue;
    const clean = k.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 8) break;
  }
  return out;
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

// Endpoint-ul de evaluare a raspunsurilor pentru Team C
app.post('/evaluate-answer', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);
  if (isRateLimited()) return rateLimitedResponse(res);

  const { body, question } = req.body;   // ⬅️ extragem și question
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' });
  }
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'question is required' });   // ⬅️ validăm question
  }

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(EVALUATE_ANSWER_SYSTEM_PROMPT),
        {
          role: 'user',
          content: `Question: "${sanitizeInput(question, 300)}"\nAnswer: "${sanitizeInput(body, 500)}"`,   // ⬅️ trimitem ambele
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 20,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const validBadges = ['helpful', 'needs-detail', 'off-topic'];
    
    // Curățăm textul generat de LLM de eventuale spații sau litere mari accidentale
    const rawBadge = parsed?.badge?.toString().toLowerCase().trim();

    // Dacă badge-ul extras nu este unul valid, aruncăm o eroare controlată ca să intre pe catch
    if (!validBadges.includes(rawBadge)) {
      throw new Error(`Invalid badge generated by LLM: ${rawBadge}`);
    }

    return res.json({ badge: rawBadge });
    } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    
    logger.error('/evaluate-answer failed', { error: err.message });
    // Întoarcem 503 agreat în cerință fără să lăsăm procesul Node să moară
    return res.status(503).json({ error: 'Evaluation service unavailable' });
  }
});
app.post('/summarize', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { title, description, answers } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: 'description is required' });
  }

  // Validate answers if provided
  if (answers && (!Array.isArray(answers) || answers.length > 3)) {
    return res.status(400).json({ error: 'answers must be an array with max 3 items' });
  }

  try {
    let userContent = `Question title: "${sanitizeInput(title)}"\n\nDescription: "${sanitizeInput(description)}"`;
    
    if (answers && Array.isArray(answers) && answers.length > 0) {
      const validAnswers = answers
        .filter((a) => typeof a === 'string' && a.trim().length > 0)
        .slice(0, 3);
      
      if (validAnswers.length > 0) {
        userContent += '\n\nAnswers:\n';
        validAnswers.forEach((answer, idx) => {
          userContent += `${idx + 1}. "${sanitizeInput(answer)}"\n`;
        });
      }
    }

    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(SUMMARY_SYSTEM_PROMPT),
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 150,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const summary = parsed.summary ?? '';
    return res.json({ summary });
  } catch (err) {
    if (isGroq429(err)) {
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '300', 10);
      tripCircuitBreaker(retryAfter);
      return rateLimitedResponse(res);
    }
    logger.error('/summarize failed', { error: err.message });
    return res.status(503).json({ error: 'Summary service unavailable' });
  }
});

app.post('/smart-search', async (req, res) => {
  if (isRateLimited()) return rateLimitedResponse(res);

  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(SMART_SEARCH_SYSTEM_PROMPT),
        { role: 'user', content: `Search query: "${sanitizeInput(query)}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 120,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const keywords = sanitizeKeywords(parsed.keywords ?? []);
    return res.json({ keywords });
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