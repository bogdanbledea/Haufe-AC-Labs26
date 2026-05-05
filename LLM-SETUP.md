# Setting Up Your LLM

You need an LLM for the AI features — tag generation, duplicate detection, and the AI Companion. Two options. Pick one.

---

## Which one?

| | Groq (cloud) | Ollama (local) |
|---|---|---|
| Setup | Create an account, copy an API key | Install an app, pull a model |
| Speed | Fast | Depends on your machine |
| Cost | Free tier, no credit card | Free |
| Works offline | No | Yes |
| RAM needed | None | At least 8GB |

**Less than 8GB RAM → use Groq.**  
**8GB+ and want everything local → use Ollama.**

Both use the same code. You just change two lines in your `.env`.

---

## Option A — Groq

### 1. Create an account

Go to [console.groq.com](https://console.groq.com) and sign up. No credit card.

### 2. Get your API key

**API Keys → Create API Key**. Copy it — you won't see it again.

### 3. Set your `.env`

In both `smo-ai/.env` and `smo-backend/.env`:

```
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...your key here...
GROQ_MODEL=llama-3.1-8b-instant
```

### 4. Verify

```bash
curl http://localhost:3100/health
```

You should see `"provider": "groq"` in the response.

### Free tier limits

~30 requests/minute and ~14,000/day. Well above what you'll need while building. If you hit a limit, the app degrades gracefully — AI features pause for a bit, nothing crashes.

---

## Option B — Ollama

### 1. Install Ollama

Download from [ollama.com](https://ollama.com). After installing, Ollama runs in the background automatically.

Verify it's up:
```bash
curl http://localhost:11434/api/tags
```

### 2. Pick a model

| RAM | Model | Download size |
|---|---|---|
| 8GB | `llama3.2:3b` | ~2GB |
| 16GB | `llama3.1:8b` | ~5GB |
| 32GB+ | `qwen2.5-coder:14b` | ~9GB |

Not sure how much RAM you have? Mac: **Apple menu → About This Mac**. Windows: **Task Manager → Performance → Memory**.

### 3. Pull the model

```bash
ollama pull llama3.2:3b
```

Takes a few minutes. Only needs to happen once.

### 4. Set your `.env`

In both `smo-ai/.env` and `smo-backend/.env`:

```
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### 5. Verify

```bash
curl http://localhost:3100/health
```

You should see `"provider": "ollama"` and your model name.

---

## Switching between the two

Change `LLM_PROVIDER` in your `.env` files and restart both smo-ai and smo-backend.

```
LLM_PROVIDER=groq    # cloud
LLM_PROVIDER=ollama  # local
```

Everything else stays the same.

---

## Troubleshooting

**`GROQ_API_KEY is not set`**  
You're on `LLM_PROVIDER=groq` but forgot the key. Add it or switch to `ollama`.

**smo-ai starts but tag generation returns empty**  
Check the smo-ai terminal. If you're on Ollama, run `ollama list` and make sure the model name in `OLLAMA_MODEL` matches exactly.

**`address already in use` on port 11434**  
Ollama is already running (probably the desktop app). That's fine — it means it's working. Don't run `ollama serve` manually.

**Responses are slow on Ollama**  
Larger models are slower, especially on CPU. If `llama3.1:8b` is too slow, drop down to `llama3.2:3b`. On Apple Silicon it runs notably faster than on Intel.

**AI features stop working mid-session on Groq**  
You hit the rate limit. Wait a minute. The app won't crash.
