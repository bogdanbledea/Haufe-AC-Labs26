# Application Specs — Stack my Overflow

This is what you're building over the 10 weeks. Read it once at the start, come back whenever you're not sure what something's supposed to do.

Three AI features are built during the labs — tag generation, duplicate detection, and the AI Companion. You'll design and ship a fourth yourself.

---

## Authentication

Users register and log in. Passwords are hashed — no plaintext, no exceptions.

Don't return the password in any API response, ever. If someone isn't logged in and tries to do something that needs auth, tell them. Don't silently hide buttons, and don't let requests fail with a vague 401 and no explanation.

---

## Core Features

### Home Page — Question List

Logged-in users see all questions on the platform. Each question shows: title, tags, author username, vote count, answer count, and whether it's been answered. Users can filter by tag.

### Question Details

Clicking a question opens the detail page with the full title, description, all answers, and comments on both the question and each answer. If an answer was accepted, mark it clearly — it shouldn't take three seconds to figure out which one it is.

### Voting

Users can upvote or downvote questions and answers. Vote count is always visible.

### Accepting an Answer

The person who asked the question can mark one answer as correct. Only the question owner — not anyone else.

### Comments

Users can comment on questions and on answers. Comments aren't voteable. Just text.

---

## Asking a Question

The "Ask a Question" page has:

- **Title** — required
- **Description** — required, at least a few sentences; markdown support is a plus
- **Tags** — users can type them manually, or click a button to generate them with AI
- **AI Companion toggle** — a checkbox that says something like "Allow AI to answer if it thinks it can help"

### Duplicate Check

As the user types the title, the app checks whether something similar was already asked. If it finds possible duplicates, show them below the form as clickable links. The user can still post — this is a heads up, not a blocker.

### AI Companion

If the toggle is on, after the question is saved the app dispatches a background job to process it. The job uses a queue — if multiple questions come in at once, process them one at a time. Don't flood the model.

There's an **AI Companion** user in the database. The background job posts the answer as that user. Mark AI Companion answers visually in the UI — it should be obvious they're not from a real person. If the question already has an accepted answer when the job runs, skip it.

---

## AI Service

AI features run in a separate service — not inside the main backend. Your app calls it over HTTP. If it goes down, the app keeps working; it just loses the AI features.

Three endpoints:

### `POST /tags`

Called when the user clicks "Generate tags". Send the question title, get back 3–5 lowercase, hyphenated tags.

```
Request:  { "title": "How do I center a div in CSS?" }
Response: { "tags": ["css", "flexbox", "layout", "centering"] }
```

If it fails, return `{ "tags": [], "error": "..." }` with a 503. The frontend shows no tags and lets the user add them manually. Not an error state — just a quiet fallback.

### `POST /check-duplicate`

Called with a short debounce as the user types. The backend fetches existing question titles from the DB and passes them here with the new title.

```
Request:  { "title": "How to center elements in CSS?", "existing": [{ "id": "...", "title": "..." }] }
Response: { "isDuplicate": true, "duplicateId": "abc123", "matches": [{ "id": "abc123", "title": "..." }] }
```

If `isDuplicate` is true, show the matches as links below the form. If the service is unreachable, skip the check silently.

### `GET /health`

Returns whether the service is up. The frontend uses this to decide whether to show AI-powered UI elements.

```
Response: { "ok": true, "provider": "ollama", "model": "llama3.2:3b" }
```

---

## AI failures shouldn't crash the app

If the AI service is down, timing out, or returning garbage — the app keeps working. Users can still ask questions, answer, vote, and comment. Don't let the AI integration take down the main flow.

---

## Your Own AI Feature

Three AI features ship during the labs. Your job is to design and build a fourth — on top of everything you've already built.

One requirement: it has to add real value. Something a product team would actually consider shipping, not a demo that only works when you control the input.

Some directions if you need a starting point:

- **Answer quality scoring** — before a user submits an answer, the AI checks whether it's likely to be useful given the question; surfaces a subtle nudge if not
- **Smart related questions** — after a question is posted, surface semantically similar ones (not just tag matches) so knowledge doesn't get siloed
- **Auto-moderation** — flag low-effort questions or answers before they go live, with a reason the user can read and act on
- **Comment tone detection** — surface a warning if a comment reads as hostile before it's posted, without blocking submission
- **Question clarity improvement** — as the user writes their description, offer a one-click rewrite that makes it more precise and answerable

These are starting points, not a list to pick from. The best features are the ones you notice the app actually needs.

When you present it: show what works, what you changed from your first version, and what you'd do differently. The ups and the downs are both worth talking about.

---

## UI

Clean and minimal. Good spacing, readable, clear hierarchy. No clutter.

Handle the obvious edge cases: no questions yet, no answers yet, no results for a tag filter. Handle loading states — don't leave users staring at a blank screen while data loads.
