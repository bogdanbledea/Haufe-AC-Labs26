// HTTP wrapper for the smo-ai service.
// Every call is wrapped in try/catch — if the AI service is down,
// callers get null back and the main backend keeps working.

const logger = require('../logger');

const BASE = process.env.SMO_AI_URL || 'http://localhost:3100';
const SECRET = process.env.SMO_AI_SECRET;

async function post(path, body, timeoutMs = 10000) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SECRET && { 'x-internal-secret': SECRET }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429) {
    logger.warn('smo-ai rate limited (Groq 429)', { path });
    return { rateLimited: true };
  }
  if (!res.ok) throw new Error(`smo-ai ${path} returned ${res.status}`);
  return res.json();
}

async function suggestTags(title) {
  try {
    return await post('/tags', { title });
  } catch (err) {
    logger.error('smoAi.suggestTags failed', { error: err.message });
    return null;
  }
}

async function health() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

module.exports = { suggestTags, health };
