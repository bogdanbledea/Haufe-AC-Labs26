# Homework — Lab 5: Database + Authentication

This homework builds on **Lab 5 — Database + Authentication**. In the lab you learned relational data modeling, wrote SQL queries, set up Supabase, configured RLS, and connected the frontend directly to the database. Now you'll deepen that understanding and wire up more of the app.

---

## Context

Your `smo-frontend` talks directly to Supabase using the publishable key. Auth works via `supabase.auth`. RLS policies protect the data. There is no backend yet — that comes in Lab 6.

You have:
- A Supabase project with the full schema (7 tables + 3 atomic functions)
- RLS enabled on `questions` (at minimum)
- A registered user with a profile
- `Home.tsx` fetching questions from Supabase with joins
- `SignIn.tsx` and `SignUp.tsx` working with `supabase.auth`

---

## Part 1 — SQL practice

Open the Supabase SQL Editor. Write and run the following queries against your seeded data. Save them in a file called `homework-queries.sql` in your repo so you can reference them later.

### Required queries

1. **Get all questions with their author's username, ordered by most recent first.**

2. **Get all answers for a specific question (pick one by ID), including the answer author's username.**

3. **Count how many answers each question has.** Return the question title and the count. Include questions with 0 answers.

4. **Find the user who has asked the most questions.** Return their username and the count.

5. **Get all questions tagged "javascript".** Return the title and author username.

6. **Get the total number of upvotes and downvotes each user has received** (across their questions and answers).

### Hints

- Use `JOIN` to connect tables
- Use `LEFT JOIN` when you want to include rows with no matches (e.g., questions with 0 answers)
- Use `GROUP BY` with `COUNT()` for aggregation
- Use `WHERE` to filter, `ORDER BY` to sort, `LIMIT` to cap results

---

## Part 2 — Wire up `AskQuestion.tsx`

The Ask a Question form currently validates input but doesn't submit anywhere. Wire it up to insert a question into Supabase.

### What to do

1. On submit, insert a row into `questions` with the logged-in user's ID as `author_id`
2. For each tag the user entered:
   - Upsert into `tags` (insert if new, return existing if already there)
   - Insert into `question_tags` to link the tag to the question
3. After success, navigate to the home page (or the new question's detail page)
4. If the user is not logged in, show a message or redirect to sign-in

### Things to think about

- The Supabase client's `.upsert()` with `onConflict: 'name'` handles the "don't create duplicate tags" problem
- You need the question's ID after inserting it — `.insert(...).select()` returns the created row
- RLS will enforce that `auth.uid() = author_id` — if you try to insert with a different author_id, it will fail silently (empty result, no error thrown). Make sure you're using the logged-in user's actual ID.

---

## Part 3 — Write RLS policies for `answers`

In the lab we wrote RLS policies for `questions` together. Now do the same for `answers`.

### Requirements

- Anyone can **read** all answers (SELECT)
- Only authenticated users can **insert** answers, and only as themselves (`auth.uid() = author_id`)
- Only the answer author can **update** their own answer
- Only the answer author can **delete** their own answer

### What to do

1. Enable RLS on the `answers` table
2. Write and run the four policies in the SQL Editor
3. Test: try to insert an answer from the frontend. It should work when logged in and fail (empty result) when not.

### Bonus

Write RLS policies for `comments` and `votes` too. Same pattern — think about who should be able to do what.

---

## Part 4 — Verify persistence

This is simple but important. Confirm that your app actually persists data:

1. Create a question through the frontend form
2. Close the browser tab completely
3. Reopen the app — the question should still be there
4. Restart your dev server — the question should still be there
5. Log out and log back in — your questions should still show your username as the author

If any of these fail, something is wrong with your Supabase connection or RLS policies.

---

## Acceptance Criteria

**SQL queries:**
- All 6 queries run successfully in the SQL Editor
- Queries use appropriate JOINs (not multiple separate queries)
- Results make sense given the seeded data

**AskQuestion:**
- Submitting the form creates a question in Supabase with the correct `author_id`
- Tags are upserted (no duplicates in the `tags` table)
- Tags are linked to the question via `question_tags`
- The form only works when logged in

**RLS policies:**
- `answers` table has RLS enabled
- SELECT works for everyone (including unauthenticated)
- INSERT only works for authenticated users inserting as themselves
- UPDATE/DELETE only works for the answer author

**Persistence:**
- Data survives page refresh, browser close, and server restart

---

## Up next — Lab 6: Backend / API Layer

Right now your frontend talks directly to Supabase. That works for simple apps, but most real-world applications put a backend in between. In Lab 6 you'll learn why — business logic, security boundaries, and the fact that most databases don't come with a ready-made API. You'll build an Express backend, move all the Supabase calls behind it, and implement auth with JWT tokens.
