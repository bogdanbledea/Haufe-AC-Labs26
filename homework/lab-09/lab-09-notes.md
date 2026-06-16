# Lab 9 & 10 — Presentations + Deployment

**Jun 16 — last session.**

No homework. You're done. Below is everything you need if you missed the session or want to deploy on your own.

---

## What happened in the session

**First half — team presentations.**  
Each team demoed the custom AI feature they built after Lab 8. The format was simple: show the running app, walk through the prompt, say what worked, say what didn't. No slides.

**Second half — deployment.**  
Every team deployed their app live: frontend to Vercel, backend and AI service to Railway.

---

## Deploying your app

If you weren't there, here's the exact flow we followed. You need a [Vercel](https://vercel.com) account and a [Railway](https://railway.app) account — both have free tiers that cover this app.

### 1. Deploy the AI service to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your repo and point Railway at the `app/smo-ai` folder (or your equivalent path)
3. Set these environment variables in Railway's dashboard:

   | Variable | Value |
   |---|---|
   | `LLM_PROVIDER` | `groq` (or `ollama` if you set up a remote instance) |
   | `GROQ_API_KEY` | your Groq API key |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` (or whichever you used) |
   | `PORT` | `3100` |

4. Railway gives you a public URL like `https://smo-ai-production-xxxx.up.railway.app` — copy it, you'll need it next.

### 2. Deploy the backend to Railway

1. New Project → Deploy from GitHub repo → same repo, point at `app/smo-backend`
2. Set environment variables:

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key (not the anon key) |
   | `AI_SERVICE_URL` | the Railway URL from step 1 (e.g. `https://smo-ai-production-xxxx.up.railway.app`) |
   | `JWT_SECRET` | same secret you used locally |
   | `PORT` | `3000` |

3. Copy the backend Railway URL — you'll need it for the frontend.

### 3. Update CORS in the backend

Before deploying the frontend, add the Vercel URL to your CORS config in `smo-backend`. You don't know it yet, so either:

- **Option A:** set `CORS_ORIGIN=*` temporarily, deploy both, then lock it down to the real Vercel URL.
- **Option B:** deploy the frontend first (step 4), get the URL, then update `CORS_ORIGIN` in Railway and redeploy.

In your backend `app.js`, make sure you're reading CORS origin from an env var:

```js
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
```

### 4. Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select your repo; set the root directory to `app/smo-frontend`
3. Vercel auto-detects Vite — build command `npm run build`, output directory `dist`
4. Set environment variables:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | your backend Railway URL (e.g. `https://smo-backend-production-xxxx.up.railway.app`) |

5. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.

### 5. Lock down CORS

Go back to your backend Railway project, set `CORS_ORIGIN` to your Vercel URL (e.g. `https://your-app.vercel.app`), and trigger a redeploy.

### Quick sanity check

- Open your Vercel URL → register an account → post a question → generate tags → confirm the AI Companion answer appears
- If something breaks, check Railway logs first (they're the most useful), then browser DevTools network tab

---

## Feedback

The labs are done. We'd love to know what worked, what didn't, and what you'd change.

**It takes 2 minutes. A few rating scales (1–5) and a couple of open questions — be as honest as you want.**

> **[Leave your feedback here](https://forms.office.com/e/wnMYKVLR1q)**

Anonymous is fine. Honest is better.
