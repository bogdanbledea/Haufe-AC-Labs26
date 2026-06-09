# Lab 8 — Team Tasks

In Lab 8 the class splits into three teams. Each team builds one AI-powered feature on top of the existing app. All three features are independent — you work in parallel on separate branches.

## Teams and features

| Team | Feature | File |
|------|---------|------|
| Team A | AI Question Summary — "Summarize" button on the question detail page | [team-a-question-summary.md](team-a-question-summary.md) |
| Team B | AI Smart Search — semantic search bar on the Home page | [team-b-smart-search.md](team-b-smart-search.md) |
| Team C | AI Answer Quality Badge — automatic badge on every posted answer | [team-c-answer-quality-badge.md](team-c-answer-quality-badge.md) |

## How to work

1. **Find your team's file** in the table above and read it fully before writing any code.
2. **Agree on the API contract first** (the request/response shapes between smo-ai, smo-backend, and smo-frontend). Your file has a dedicated section for this. Don't skip it — this is what lets everyone code in parallel without blocking each other.
3. **Pick a role** within your team: AI engineer, backend engineer, or frontend engineer. Each file lists exactly what each role should build.
4. **Create your branch** using the branch name in your file (e.g. `team-a/ai-question-summary`).
5. **Start with a mock if you're blocked** — every file has a tip on how to unblock yourself while waiting for another role to finish.

## If you're working alone or remotely

Read your team's file end to end. You're building all three roles yourself, so:

1. Start with the AI endpoint in `smo-ai/index.js` — it has no dependencies.
2. Then add the backend route and service function.
3. Then wire the frontend.

Each file has an acceptance criteria checklist at the bottom. Use it to know when you're done.
