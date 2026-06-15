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
Your only job is to evaluate the quality of a developer's answer.

Rules:
- Return exactly one of three values: "helpful", "needs-detail", or "off-topic"
- "helpful": the answer is relevant, clear, and addresses the question
- "needs-detail": the answer is on-topic but too vague, incomplete, or missing explanation
- "off-topic": the answer does not address the question at all
- Output ONLY valid JSON. Format: {"badge": "helpful"}`;

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

  const { body } = req.body;
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' });
  }

  try {
    const completion = await llm.chat.completions.create({
      model: MODEL,
      messages: [
        sysMsg(EVALUATE_ANSWER_SYSTEM_PROMPT),
        { role: 'user', content: `Answer: "${sanitizeInput(body, 500)}"` },
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