# Team B — AI Smart Search

## What you're building

A search bar on the Home page. Instead of exact keyword matching, the AI expands the query into related terms, then the backend searches Supabase using those terms. Searching "how do I async javascript" should surface questions about Promises, async/await, and event loops — even if those exact words aren't in the titles.

**User experience:**
1. User types in the search bar on the Home page
2. After they stop typing (short debounce), the search fires
3. The question list updates to show matching results
4. Clearing the search restores the full question list

---

## Branch name

`team-b/ai-smart-search`

---

## API contract

Agree on this in the first 15 minutes — don't start coding until everyone agrees on the request/response shapes.

**smo-ai endpoint:**
```
POST /smart-search
Request:  { query }
Response: { keywords: string[] }
Error:    503
```

**Backend route:**
```
POST /ai/smart-search
Request:  { query }
Response: { questions: QuestionSummary[] }
```
The backend calls smo-ai to expand the query into keywords, then searches Supabase for questions matching any of those keywords. If smo-ai is unavailable, fall back to a simple search using the original query.

---

## Roles

**AI engineer** — works in `smo-ai`

Add the `/smart-search` endpoint. It receives a search query and returns a list of related keywords the backend can use to search. Think about what a good prompt looks like — you want diversity of terms, not repetition.

**Backend engineer** — works in `smo-backend`

Add a service function that calls smo-ai, and a route that takes a query, gets keywords from smo-ai, and searches Supabase using those keywords across question titles and descriptions. Look at how Supabase's `.or()` filter works. Shape the response the same way `GET /questions` does.

**Frontend engineers** — works in `smo-frontend`

Split the work between the search bar component (input, debounce, clear button, loading state) and the Home page integration (wiring the search into the question list, handling empty results, coexisting with tag filters). The component can be built with a mock before the backend is ready.

---

## Acceptance criteria

- [ ] Search bar appears above the question list on the Home page
- [ ] Typing and pausing fires the search
- [ ] Results update to show matching questions
- [ ] Clearing the search restores the full question list
- [ ] Empty results are handled gracefully with a message
- [ ] If smo-ai is unavailable, search falls back to simple matching without crashing
