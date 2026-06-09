# Lab 8 — Setup

You're starting from the shared app code in `/app`. Follow these steps once before the lab.

---

## 1. Copy the app code

The starting point is already in this repo under `/app`. Copy it to wherever you keep your project:

```bash
cp -r app/ ~/your-project-folder/
cd ~/your-project-folder/app
```

Or just work directly from the repo — up to you.

---

## 2. Install dependencies

```bash
cd smo-ai && npm install && cd ..
cd smo-backend && npm install && cd ..
cd smo-frontend && npm install && cd ..
```

---

## 3. Create a new Supabase project

Go to [supabase.com](https://supabase.com) → New project. Pick a name, set a password, choose the closest region. Wait ~1 minute for it to provision.

---

## 4. Run the schema

In your Supabase project: **SQL Editor → New query**.

Paste the contents of `homework/lab-08/migration.sql` → **Run**

That's it — no seed data needed, you'll create real data during the lab.

---

## 5. Get your Supabase credentials

**Project Settings → API:**
- `Project URL` → this is your `SUPABASE_URL`
- `service_role` key (under Project API keys) → this is your `SUPABASE_SERVICE_ROLE_KEY`

---

## 6. Configure your `.env` files

**`smo-ai/.env`** (copy from `.env.example`):
```
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.1-8b-instant
SMO_AI_SECRET=pick-any-random-string
PORT=3100
```

**`smo-backend/.env`** (copy from `.env.example`):
```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.1-8b-instant
SMO_AI_URL=http://localhost:3100
SMO_AI_SECRET=same-string-as-smo-ai
```

`SMO_AI_SECRET` must match in both files. Any random string works — it's just an internal shared secret between the two services.

For LLM setup (Groq vs Ollama), see [LLM-SETUP.md](../../LLM-SETUP.md).

---

## 7. Start the services

Three terminals:

```bash
# Terminal 1
cd smo-ai && npm run dev

# Terminal 2
cd smo-backend && npm run dev

# Terminal 3
cd smo-frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you should see the app.

---

## 8. Verify

- Register an account → should work
- Post a question → should appear in the list
- Click "✦ Generate tags" → should suggest tags (requires LLM running)
- `GET http://localhost:3100/health` → should return `{ "ok": true, ... }`
