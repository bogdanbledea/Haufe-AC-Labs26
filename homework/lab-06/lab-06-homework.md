# Homework — Lab 6: Answer Routes + Optimistic Voting

**TL;DR — By the time you finish this homework, your app should be fully working end-to-end, without any AI features. Users can post questions, post answers, vote, and comment. All backend routes are implemented and connected to the real database. The frontend wires up every feature. This is your checkpoint before we move into AI territory — if something is still broken or missing, now is the time to fix it.**

---

This homework builds on **Lab 6 — Backend / API Layer**. In the lab you built the Express backend, wired up question routes against the real Supabase database (using the service role key), set up `requireAuth` middleware, and connected the frontend to the real API. Now you are going to extend both sides.

---

## Context

### Backend

Your `smo-backend` is an Express app running on port 3000. It connects to Supabase using the **service role key** — meaning it bypasses RLS entirely. The `requireAuth` middleware in `middleware/auth.js` is your gatekeeper: it reads the `Authorization: Bearer <token>` header, validates the JWT via Supabase, and attaches the user to `req.user`. If the token is missing or invalid, the route handler never runs.

The data lives in real Supabase tables:

```
questions — id, title, description, author_id, is_solved, vote_count, created_at
answers   — id, question_id, author_id, body, is_accepted, vote_count, created_at
```

You already have these routes:

```
GET   /questions              → { questions: [...] }
GET   /questions/:id          → { question: { ..., answers: [...] } }
POST  /questions              → { question: newQuestion }         (protected)
PATCH /questions/:id/vote     → body: { value: 1 | -1 } → { vote_count: number }  (protected)
```

Also, you should implement:

```
GET   /health                 → { ok: true }
```

`/health` is needed for infrastructure health checks — if the service is up and running, it returns `{ ok: true }`. If not, or nothing responds, deployment platforms know to restart the microservice. We will see this in action during the deployment lab.

### Frontend

`smo-frontend` is connected to the backend. The direct Supabase calls are gone from the frontend. The `api.ts` file has a `request()` helper that handles `fetch`, headers, the auth token, and error parsing. You add new API calls by writing thin functions on top of it.

The `QuestionDetail` page already loads and displays a question with its answers. But there's no way to answer or vote yet.

---

## Part 1 — Backend: complete the answer routes

Some of you have a partially complete `answers.js` router. Finish it. Think about what each route needs to do before writing a single line of code.

### `POST /questions/:questionId/answers`

This route is **protected** — apply `requireAuth`. A user submits a new answer to a specific question. The request body has one field: `body` (the answer text).

Before creating anything, validate the input — an empty body should be rejected with a 400. Check that the question exists in Supabase; if it doesn't, return 404. If everything is fine, insert a new row into the `answers` table. Use `req.user.id` as `author_id` — don't trust what the client sends. Return the created answer with status 201.

Look at how `POST /questions` is structured to understand the pattern. Follow the same conventions — same Supabase insert, same validation approach, same response shape.

### `PATCH /answers/:answerId/accept`

This route is **protected** — apply `requireAuth`. The question owner marks one answer as the correct one.

Fetch the answer from Supabase, including its parent question. If the answer doesn't exist, return 404. Then check: is `req.user.id` the same as `author_id` on the **question**? If not, return 403 — only the question author can accept answers.

If the user is authorized, mark the answer as accepted (`is_accepted = true`) and mark the parent question as `is_solved = true`.

And there's an important detail: **only one answer per question can be accepted at a time**. If another answer on the same question is already accepted, unaccept it first before accepting the new one.

Return the updated answer on success.

This is business logic that cannot live in the frontend — a malicious user could skip the authorization check from the browser. The backend prevents that.

---

## Part 2 — Frontend: optimistic voting

Right now the QuestionDetail page shows the vote count but there's no way to change it. Add upvote and downvote buttons.

First, add a function in `api.ts` that calls `PATCH /questions/:id/vote` with `{ value: 1 | -1 }` and returns the updated `vote_count`.

Then add a `VoteButton` component. It should display the current count between an upvote and a downvote button. It takes the count and a callback as props.

The interesting part is **optimistic updates**. The idea: when the user clicks a vote button, update the displayed count in React state *immediately*, before the API call comes back. This makes the UI feel instant. Then, when the response arrives, sync the state with the actual count from the server. If the call fails for any reason, revert the count back to what it was before the click.

This is a very common pattern in real apps. Think about the three moments: before the call, after success, and after failure — you need to handle all three.

Wire the `VoteButton` into `QuestionDetail.tsx` next to the question's vote count.

---

## Testing with curl

Test your new backend routes before touching the frontend. First get a token by logging in, then use it on protected routes:

```bash
# Log in and grab your token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Check existing questions
curl http://localhost:3000/questions

# Post an answer to a question (requires auth)
curl -X POST http://localhost:3000/questions/<question-id>/answers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"body": "Your answer text here"}'

# Accept that answer (requires auth — must be question author)
curl -X PATCH http://localhost:3000/answers/<answer-id>/accept \
  -H "Authorization: Bearer <your-token>"

# Vote on a question (requires auth)
curl -X PATCH http://localhost:3000/questions/<question-id>/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"value": 1}'
```

If your routes are set up correctly, these should return the right shapes. Get this working before you touch the frontend.

---

## Acceptance Criteria

**Backend:**
- `POST /questions/:id/answers` with a valid body returns 201 and the new answer object
- `POST /questions/:id/answers` with an empty body returns 400
- `POST /questions/:id/answers` for a non-existent question returns 404
- `POST /questions/:id/answers` without a valid token returns 401
- `PATCH /answers/:id/accept` marks the answer as accepted and the question as solved
- `PATCH /answers/:id/accept` by a user who is not the question author returns 403
- Accepting a second answer on the same question removes the accepted state from the first one
- `PATCH /answers/:id/accept` for a non-existent answer returns 404

**Frontend:**
- The QuestionDetail page shows upvote and downvote buttons next to the vote count
- Clicking upvote immediately increments the displayed count
- Clicking downvote immediately decrements it
- If the vote API call fails, the count reverts to what it was before the click

---

## Up next — Lab 7: AI Feature: Auto-Generated Tags

In Lab 7 you'll spin up a second Express service that calls a local LLM (via Ollama or Groq). You'll learn how LLMs work as an API, how to engineer prompts that return consistent structured output, and how to add a "Generate tags" button to the Ask a Question form — the user clicks it while writing their question and the AI suggests tags before they post.
