# Homework — Lab 7: The "Generate Tags" Button + Model Quality

This homework builds on **Lab 7 — AI Feature: Auto-Generated Tags**. In the lab we built the AI microservice (`smo-ai`), learned how LLMs work as an API (system messages, `temperature`, `max_tokens`, `response_format`), worked through prompt engineering version by version, and wired the service into the backend (`POST /ai/tags`, `GET /ai/health`).

We ran out of time before the **frontend** — so that's the main thing you're building now. The user should be able to click a button while writing a question and have the AI suggest tags.

> **Reference code:** the AI service and backend integration we built in the lab are published in [`./ai-code/`](./ai-code/) — with a README on how to run and wire it up. If your `smo-ai` or backend routes are incomplete, use it to catch up before starting the frontend. As always: if you can't explain a line, you don't own it.

---

## Where things stand

After the lab, this is the path a tag request takes:

```
browser ──► smo-backend (3000) ──► smo-ai (3100) ──► Groq / Ollama
            POST /ai/tags          POST /tags         LLM
```

- **`smo-ai`** runs on port 3100. `POST /tags` takes `{ title }` and returns `{ tags: [...] }`. `GET /health` reports whether the service (and the LLM behind it) is available. Exact shapes are below.
- **`smo-backend`** has `POST /ai/tags` and `GET /ai/health` that proxy to `smo-ai`. When `smo-ai` is down, these return safe fallbacks (`{ tags: [] }`, `{ ok: false }`) instead of crashing.
- **The frontend has none of this yet.** The Ask a Question form lets you type tags by hand, but there's no AI button.

Before you start, get all three running at once (three terminals): frontend, `smo-backend`, `smo-ai`. Confirm `curl -X POST http://localhost:3000/ai/tags -H "Content-Type: application/json" -d '{"title":"How do I center a div in CSS?"}'` returns tags.

### What the endpoints give you

These are the exact shapes your frontend will work with. Knowing them up front saves you a lot of guessing:

```jsonc
// POST /ai/tags   body: { "title": "How do I center a div in CSS?" }
{ "tags": ["css", "flexbox", "centering", "layout"] }

// POST /ai/tags   when the AI is down → still a 200, just empty
{ "tags": [] }

// POST /ai/tags   when Groq is rate-limited → HTTP 429
{ "error": "groq_rate_limited" }

// GET /ai/health  when smo-ai is up
{ "ok": true,  "rateLimited": false, "provider": "groq", "model": "llama-3.1-8b-instant" }

// GET /ai/health  when smo-ai is unreachable
{ "ok": false }
```

So your two rules of thumb: **AI is usable** when health came back `ok: true` and `rateLimited: false`. **AI is unavailable** in every other case — and the form must still work.

---

## Part 1 — Build the "Generate tags" button

The goal: a small button next to the title field on the Ask a Question form. The user types a title, clicks the button, and the AI fills in 3–5 suggested tags — which they can then edit or remove like any manually-typed tag.

### Step 1 — Add the API calls

In your frontend `api.ts`, add two thin functions on top of the request helper you already have. This is just plumbing — the same pattern as every other API function in that file:

```ts
// adjust to match your own helper's names (post/get/request, etc.)
export const suggestTags = (title: string) =>
  post<{ tags: string[] }>('/ai/tags', { title });

export const aiHealth = () =>
  get<{ ok: boolean; rateLimited?: boolean }>('/ai/health');
```

### Step 2 — The button and its states

On the Ask a Question page, add a **"✦ Generate tags"** button near the title input. Wire it up with these pieces of state:

- **`generatingTags`** — while the `POST /ai/tags` call is in flight, disable the button and change its label to "Generating tags...". This stops double-clicks and tells the user something is happening.
- When the call returns, **merge** the suggested tags into your existing tags state. Merge, don't replace — if the user already typed `css` by hand, don't lose it, and don't add it twice (dedupe).
- The button should also be disabled when the title is empty — there's nothing to tag yet.

### Step 3 — Handle the AI being unavailable

This is the part that makes it production-quality, not a demo. The form must **never break** because the AI is down or rate-limited.

- On page mount, call `aiHealth()`. Set an **`aiDisabled`** flag to `true` unless the response is `ok: true` **and** `rateLimited` is falsy (and `true` if the call throws). When `aiDisabled` is on, hide or disable the Generate button — the user can still add tags by hand, so the form stays fully usable.
- When `POST /ai/tags` comes back as a `429` (body `{ error: "groq_rate_limited" }`), your request helper will throw — catch it and flip `aiDisabled` on, so you stop hammering a service that's already over its limit.
- Never let a failed AI call throw an unhandled error or block the submit button. Wrap the call in `try/catch`, swallow it gracefully, move on.

### One thing to get right

The tags the AI returns and the tags the user types must live in the **same state** and behave identically — removable pills, same dedupe rules, same thing sent to `POST /questions` on submit. The AI is just another way to *fill* that state, not a separate list.

---

## Part 2 — Model quality (write-up, ~half a page)

Run the **same** question title through two different models and compare the tag quality. For example:

- `llama3.2:3b` (small, local via Ollama) **vs** a bigger model (`qwen2.5-coder:14b` locally, or a larger Groq model like `llama-3.3-70b-versatile`).

Use 5 different question titles — mix easy ones ("How do I center a div in CSS?") with trickier, more specific ones. For each, note what tags each model produced.

Then answer, in your own words:

- Which model gave more **specific, useful** tags (e.g. `useEffect` over `react`)?
- Did the smaller model ever return generic junk, wrong casing, or break the JSON?
- **Which would you ship to production, and why?** Consider not just quality but speed, cost, and rate limits. The "best" answer isn't always the biggest model.

Put your write-up in a `lab-07-notes.md` in your own repo.

---

## Acceptance Criteria

- `api.ts` has `suggestTags(title)` and `aiHealth()` calling `/ai/tags` and `/ai/health`
- A "✦ Generate tags" button appears next to the title on the Ask a Question form
- Clicking it with a title filled in adds 3–5 AI-suggested tags to the form
- While generating, the button is disabled and shows a "Generating..." label
- AI-suggested tags merge with manually-typed tags (no duplicates, none lost)
- Suggested tags are removable, exactly like manual tags
- When `smo-ai` is down or rate-limited, the button is hidden/disabled and the form still works — no crash, no error thrown
- `lab-07-notes.md` contains your two-model comparison and a reasoned production pick

---

## Stretch — Tag filtering on the home page

If you finish early: make those tags actually useful for browsing. Your `GET /questions` backend route already accepts a `?tag=<name>` query parameter and returns only matching questions (it returns `[]` if none match).

- Make `getQuestions` accept an optional tag name and append it as `?tag=` when present.
- Add an `activeTag` state on the Home page; re-fetch whenever it changes (including back to `null`).
- Clicking a tag pill on a question card sets the filter; clicking the active tag again, or an "×" on an active-tag indicator above the list, clears it.
- When a filter returns nothing, show "No questions tagged 'X'." instead of the generic empty state.

This is a **server-side** filter (the fetch hits the backend with `?tag=`), not a client-side `.filter()` over an already-loaded list.

---

## Up next — Lab 8: AI Companion + Duplicate Detection

In Lab 8 you'll add two more AI features. The first: an **AI Companion** that reads new questions and automatically posts an answer in the background if it thinks it can help. The second: a **duplicate detector** that warns users as they type a title, so they can check before posting something that was already asked. Both must work without ever blocking the main app — even when the AI is slow or completely unavailable, exactly like the graceful degradation you built today.
