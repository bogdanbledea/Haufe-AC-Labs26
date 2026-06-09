# Team C — AI Answer Quality Badge

## What you're building

When a user posts an answer, the AI silently evaluates it and attaches one of three badges: **Helpful**, **Needs more detail**, or **Off-topic**. The badge appears on the answer card next to the author name.

This is fire-and-forget from the user's perspective: the answer appears immediately. If evaluation fails, the answer shows without a badge — no disruption.

**User experience:**
1. User posts an answer
2. The answer appears immediately
3. A small badge appears on the answer card — "Helpful", "Needs more detail", or "Off-topic"
4. If evaluation fails, no badge is shown and the answer still works normally

---

## Branch name

`team-c/ai-answer-quality-badge`

---

## API contract

Agree on this in the first 15 minutes — don't start coding until everyone agrees on the request/response shapes.

**smo-ai endpoint:**
```
POST /evaluate-answer
Request:  { body }
Response: { badge: "helpful" | "needs-detail" | "off-topic" }
Error:    503
```

**Backend change:**
After saving the answer, call smo-ai and include the badge in the response:
```
answer object returned to frontend: { ...answer, quality_badge: "helpful" | "needs-detail" | "off-topic" | null }
```

---

## Roles

**AI engineer** — works in `smo-ai`

Add the `/evaluate-answer` endpoint. It receives an answer body and returns one of three badge values. Think carefully about the prompt — you want the model to return only valid JSON with one of the three exact values, nothing else. Consider what `temperature` and `max_tokens` make sense for a classification task like this.

**Backend engineer** — works in `smo-backend`

Add a service function that calls smo-ai with a timeout, and modify the answer creation route to call it after the answer is saved. The badge should be included in the 201 response. If evaluation fails or times out, `quality_badge` should be `null` — the answer must still be returned successfully.

**Frontend engineer** — works in `smo-frontend`

Update the `Answer` type to include `quality_badge`, and update the answer card component to display a small badge next to the author name. Use visually distinct styles for each badge type. If `quality_badge` is null or missing, render nothing. The badge UI can be built and tested independently before the backend is ready.

---

## Acceptance criteria

- [ ] Posting an answer returns a `quality_badge` field in the response
- [ ] Badge appears on the answer card immediately after posting
- [ ] All three badge types are visually distinct
- [ ] If evaluation fails, the answer still posts and shows without a badge
- [ ] Existing answers without a badge render normally
