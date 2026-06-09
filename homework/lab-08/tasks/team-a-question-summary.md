# Team A — AI Question Summary

## What you're building

A "Summarize" button on the question detail page. When clicked, it calls the AI service and shows a short plain-English summary of the question and its best answer. Useful for long threads where you want the gist before reading everything.

**User experience:**
1. User opens a question
2. Clicks "Summarize" button
3. Button shows a loading state while waiting
4. A summary appears below the question description
5. If the AI service is unavailable, the button is hidden

---

## Branch name

`team-a/ai-question-summary`

---

## API contract

Agree on this in the first 15 minutes — don't start coding until everyone agrees on the request/response shapes.

**smo-ai endpoint:**
```
POST /summarize
Request:  { title, description, topAnswer? }
Response: { summary }
Error:    503
```

**Backend route:**
```
POST /ai/summarize
Request:  { questionId }
Response: { summary }
```
The backend is responsible for fetching the question and its top answer from Supabase before calling smo-ai. The frontend only sends the `questionId`.

---

## Roles

**AI engineer** — works in `smo-ai`

Add the `/summarize` endpoint. It receives the question title, description, and optionally the best answer, calls the LLM with an appropriate prompt, and returns the summary. Think about what makes a good summarization prompt — tone, length, format constraints.

**Backend engineer** — works in `smo-backend`

Add a service function that calls smo-ai, and a route that ties everything together: fetch the question and its top answer from Supabase, call the AI service, return the result. Handle the case where the AI service is down.

**Frontend engineers** — works in `smo-frontend`

Split the work between the UI component (the summary display box) and the page integration (wiring the button, state, and API call into the question detail page). The component can be built and tested independently before the backend is ready.

---

## Acceptance criteria

- [ ] Button appears on the question detail page
- [ ] Clicking it shows a loading state and disables the button
- [ ] Summary appears below the question description
- [ ] If the question has an accepted or top-voted answer, the summary reflects both
- [ ] If smo-ai is down, the button is hidden
- [ ] No crashes if the LLM returns unexpected output
