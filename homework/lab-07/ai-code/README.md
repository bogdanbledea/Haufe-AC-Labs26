# Lab 7 — AI code (reference)

This is the AI code from Lab 7, published so you have a correct reference. We built
the AI service and wired it into the backend during the lab, but ran out of time before
the frontend — the frontend part is your homework (see `../lab-07-homework.md`).

Use this code to check your own work, or to catch up if your version is incomplete.
**Don't just copy it blindly** — the rule still stands: if you can't explain a line, you
don't own it.

## What's here

```
smo-ai/                     ← the AI microservice (a 2nd Express app, port 3100)
  index.js                  ← /tags + /health, shared-secret check, rate limiting
  llm.js                    ← LLM client; one interface, Groq OR Ollama via baseURL
  logger.js
  package.json
  .env.example

smo-backend/                ← files to ADD to your existing backend
  services/smoAi.js         ← HTTP client that calls smo-ai (returns null if it's down)
  routes/ai.js              ← POST /ai/tags, GET /ai/health (proxies to smo-ai)
```

> Scope note: this is **Lab 7 only** — tag generation. Duplicate detection and the
> AI Companion come in Lab 8, so they're deliberately left out here.

## The shape of it

```
browser ──► smo-backend (port 3000) ──► smo-ai (port 3100) ──► Groq / Ollama
            POST /ai/tags              POST /tags                 LLM
```

The browser never talks to `smo-ai` directly — only the backend does, and it sends a
shared secret (`x-internal-secret`) so `smo-ai` knows the request is internal.

## Running smo-ai

```bash
cd smo-ai
npm install
cp .env.example .env       # then fill in GROQ_API_KEY (or set LLM_PROVIDER=ollama)
                           # and set SMO_AI_SECRET (openssl rand -hex 32)
npm run dev                # starts on http://localhost:3100
```

Smoke-test it directly (no backend needed):

```bash
curl http://localhost:3100/health

curl -X POST http://localhost:3100/tags \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <the value of SMO_AI_SECRET>" \
  -d '{"title": "How do I center a div in CSS?"}'
# → {"tags":["css","flexbox","centering","layout"]}
```

Without the `x-internal-secret` header you'll get `401 unauthorized` — that's the point.

## Wiring smo-ai into your backend

1. Copy `smo-backend/services/smoAi.js` and `smo-backend/routes/ai.js` into the matching
   folders of your own backend.
2. Mount the router in your backend's `app.js` (next to the others):

   ```js
   const aiRoutes = require('./routes/ai');
   // ...
   app.use('/ai', aiRoutes);
   ```

3. Add these to your **backend** `.env`:

   ```
   SMO_AI_URL=http://localhost:3100
   SMO_AI_SECRET=<same value as in smo-ai/.env>
   ```

   If the two secrets don't match, every call gets a `401` — this is the #1 thing that
   trips people up.

4. Test through the backend:

   ```bash
   curl -X POST http://localhost:3000/ai/tags \
     -H "Content-Type: application/json" \
     -d '{"title": "How do I center a div in CSS?"}'
   ```

   Note: no secret header here — the **backend** adds it for you when it calls `smo-ai`.

## Prove the graceful degradation

With everything running, kill the `smo-ai` process. Call `POST /ai/tags` on the backend
again. You should get `{ "tags": [] }` and a `503`-style miss — **not** a crash. The whole
reason this is a separate service is that the backend keeps serving when the AI is down.
