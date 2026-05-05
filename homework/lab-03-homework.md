# Homework — Lab 3: Verify Your LLM Setup

Three tasks. None of them involve building features. All of them are about building the habit of understanding what your tools are actually doing.

---

## Task 1 — Confirm your LLM is reachable

In Lab 7 you'll build a small service that exposes a `/health` endpoint. For now, verify your LLM provider is working directly.

**If you're on Groq**, make a raw API call and confirm you get a response:

```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }]
  }'
```

You should get a JSON response with a `choices` array. Find `choices[0].message.content` — that's the reply.

**If you're on Ollama**, confirm the model is running:

```bash
curl http://localhost:11434/api/chat \
  -d '{
    "model": "llama3.2:3b",
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }],
    "stream": false
  }'
```

Same idea — find the content in the response JSON.

If either of these fails, re-read `LLM-SETUP.md` and troubleshoot before moving on. You'll need a working LLM from Lab 7 onwards.

---

## Task 2 — Evaluate an explanation

Find a piece of JavaScript code, 5–10 lines long, that you didn't write yourself. A tutorial, a Stack Overflow answer, anywhere. Paste it into your LLM and ask it to explain what the code does, line by line.

Then read the explanation critically. Write down:

- Was it accurate? Did the AI get anything wrong?
- Was it useful? Would a beginner understand the code from this explanation?
- Did it explain *why* the code works, or just *what* it does?

No right answer to hand in. The point is that you read it critically instead of accepting it as fact. If the AI got something wrong, note what and why.

---

## Task 3 — Scaffold a function, then own it

Use the AI assistant in VS Code to generate a simple function. Something small: format a date, validate an email, debounce another function — your choice.

Once you have the code, don't move on until you can explain **every line** out loud. Not to anyone — just to yourself. If you get to a line and don't know why it's there, that's the one to investigate. Look it up, ask the AI to explain just that part, or test it in the browser console.

Write a short note (3–5 sentences): what the function does, one line that surprised you or that you had to look up, and whether you'd use this code in your project or write it differently.

---

## Acceptance Criteria

- You can make a successful API call to your LLM and get a response back
- You've evaluated an AI code explanation and written down what was accurate and what wasn't
- You've generated a small function with the VS Code AI assistant and can explain every line
- Your `.env` file is not committed — run `git log --all --full-history -- .env` to verify

---

## Up next — Lab 4: Build the Frontend

Lab 4 is where the app starts to exist. You'll set up a React + Vite + Tailwind project from scratch and build the full UI — home page, question detail page, navigation, components — all with mocked data. No backend yet. By the end you'll have something you can open in a browser and click around. Come with your tools working and your energy up.