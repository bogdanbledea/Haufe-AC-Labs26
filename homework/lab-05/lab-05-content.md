# Lab 5: DB + Auth — Presenter Guide

**⏱ ~2.5h** | **Output:** Supabase DB + auth wired to frontend | **Next:** `homework/lab-05-homework.md`

---

## Pre-check

Students have Lab 4 frontend + `AskQuestion.tsx` from HW. All data still mocked. No backend.

Missing `AskQuestion.tsx`? Not a blocker — form wiring at end is bonus.

---

## 1. Relational Data Model (≈40 min) 🧑‍🏫 WHITEBOARD

No code. Draw everything.

### Tables

```
┌─────────────────────────────────────┐
│ questions                           │
├─────────────────────────────────────┤
│ id          uuid  PK               │
│ title       text  NOT NULL         │
│ description text  NOT NULL         │
│ author_id   uuid  FK → profiles.id │
│ is_solved   bool  DEFAULT false    │
│ vote_count  int   DEFAULT 0        │
│ created_at  timestamptz            │
└─────────────────────────────────────┘
```

Types: text, integer, boolean, uuid, timestamptz

### Primary Keys

Every row → unique ID. UUID vs auto-increment:
- UUID: globally unique, Supabase Auth generates them → consistency
- Auto-increment: simpler, sequential, but collisions across systems

We use UUID.

### Foreign Keys

```
profiles.id ←──── questions.author_id
     │
     └── DB enforces this. Bad author_id → INSERT rejected. No code needed.
```

**SAY:** "DB does the check for you. Try inserting question w/ fake author_id → DB refuses."

### Constraints

| Constraint | Meaning |
|---|---|
| `NOT NULL` | must have value |
| `UNIQUE` | no duplicates |
| `DEFAULT` | auto-fill if missing |
| `ON DELETE CASCADE` | parent deleted → children deleted |

### Relationships

**One-to-many:**
```
profiles ──1────M── questions
  (one)              (many)
```

**Many-to-many:**
```
questions ──M────M── tags
         \          /
      question_tags (junction table)
      [question_id, tag_id] ← composite PK
```

**SAY:** "Can't put array in relational column. Junction table holds pairs."

**Polymorphic (comments + votes):**
```
comments/votes → target_id + target_type ('question' | 'answer')
```

One `target_id` col + `target_type` check constraint. Simpler than 2 nullable FKs.

### Full SMO Schema (DRAW)

```
┌──────────┐     ┌───────────┐     ┌──────┐
│ profiles │←────│ questions │────→│ tags │
│          │←────│           │     │      │
└──────────┘  ┌──┘           └──┐  └──────┘
     ↑        │                 │      ↑
     │    ┌───────┐      ┌──────────┐  │
     │    │answers│      │quest_tags│──┘
     │    └───────┘      └──────────┘
     │        ↑
     ├── votes (target_id + target_type)
     └── comments (target_id + target_type)
```

Tables:
- `profiles` (id, username, is_ai_companion, created_at)
- `questions` (id, title, description, author_id, allow_ai_companion, is_solved, vote_count, created_at)
- `answers` (id, body, question_id, author_id, is_accepted, is_ai_generated, vote_count, created_at)
- `tags` (id, name UNIQUE)
- `question_tags` (question_id, tag_id) — composite PK
- `votes` (id, user_id, target_id, target_type, value) — UNIQUE(user_id, target_id)
- `comments` (id, body, author_id, target_id, target_type, created_at)

### Exercise 1

**ASK:** "Delete user w/ 10 questions + 30 answers. What happens?"

→ CASCADE deletes all. Questions gone → answers on those questions gone too.

**ASK:** "Right behavior? What would StackOverflow do?"

→ They'd anonymize, not delete. For us, cascade = fine.

### Exercise 2

**ASK:** "Why UNIQUE on (user_id, target_id) in votes?"

→ One vote per user per target. DB prevents double-voting. No code check needed.

---

## 2. SQL Queries + Joins (≈40 min) 🧑‍🏫 WHITEBOARD + SQL EDITOR

### Whiteboard (≈20 min)

**Basic:**
```sql
-- All questions
SELECT * FROM questions;

-- By specific user
SELECT * FROM questions WHERE author_id = 'some-uuid';

-- 5 most recent
SELECT * FROM questions ORDER BY created_at DESC LIMIT 5;

-- Count
SELECT COUNT(*) FROM questions;
```

**Joins — draw Venn diagram:**

```
INNER JOIN:     LEFT JOIN:
  ┌───┬───┐      ┌───────┬───┐
  │   │ ✓ │      │  ✓    │ ✓ │
  └───┴───┘      └───────┴───┘
  only matches    all left + matches (or NULL)
```

```sql
-- Questions + author username
SELECT q.title, p.username
FROM questions q
INNER JOIN profiles p ON q.author_id = p.id;

-- Questions + answer count
SELECT q.title, COUNT(a.id) AS answer_count
FROM questions q
LEFT JOIN answers a ON a.question_id = q.id
GROUP BY q.id, q.title;

-- Questions + tags
SELECT q.title, t.name AS tag
FROM questions q
JOIN question_tags qt ON qt.question_id = q.id
JOIN tags t ON qt.tag_id = t.id;
```

### Student Exercises (3–5 min, then solve together)

1. "All answers for question X + author username"
```sql
SELECT a.body, p.username
FROM answers a
JOIN profiles p ON a.author_id = p.id
WHERE a.question_id = 'X';
```

2. "User w/ most questions"
```sql
SELECT p.username, COUNT(q.id) AS q_count
FROM profiles p
JOIN questions q ON q.author_id = p.id
GROUP BY p.id, p.username
ORDER BY q_count DESC
LIMIT 1;
```

3. "All questions tagged 'javascript'"
```sql
SELECT q.*
FROM questions q
JOIN question_tags qt ON qt.question_id = q.id
JOIN tags t ON qt.tag_id = t.id
WHERE t.name = 'javascript';
```

### Live in SQL Editor (≈20 min)

⚠️ **Start Supabase project creation NOW** (takes 1–2 min to spin up)

Insert sample data:
```sql
INSERT INTO profiles (id, username) VALUES
  ('aaa-111', 'alice'),
  ('bbb-222', 'bob');

INSERT INTO questions (id, title, description, author_id) VALUES
  ('q1', 'How do joins work?', 'Confused about SQL joins', 'aaa-111'),
  ('q2', 'What is a foreign key?', 'Explain like I am 5', 'bbb-222');

INSERT INTO tags (id, name) VALUES ('t1', 'sql'), ('t2', 'databases');
INSERT INTO question_tags (question_id, tag_id) VALUES ('q1', 't1'), ('q1', 't2'), ('q2', 't2');
```

Run join queries from board. Change WHERE, JOIN type, ORDER BY. Let students suggest mods.

### Indexes (≈5 min, whiteboard)

**ASK:** "5 questions → check all 5. What if 5 million?"

**Analogy:** Book w/o index → flip every page. Book w/ index → lookup topic → page number → go.

DB index = same. Without → sequential scan (slow). With → jump to matches (fast).

**Auto-indexed:**
- PKs (`id`) — always
- UNIQUE cols (`profiles.username`, `tags.name`) — always
- FKs — **NOT auto-indexed in Postgres** (common misconception!)

**Manual:**
```sql
CREATE INDEX idx_questions_author ON questions(author_id);
CREATE INDEX idx_questions_created ON questions(created_at DESC);
```

**Tradeoff:** fast reads ↔ slower writes (INSERT/UPDATE must update index too)

**Rule:** WHERE or JOIN on col + large table → probably needs index.

Don't create now (tables small). Plant concept for future.

---

## 3. Supabase Project + Schema (≈15 min)

### Setup

1. Everyone → supabase.com → New Project
2. While spinning: explain Supabase = hosted Postgres + JS client + auth + auto API + free tier

### Run Schema

Paste full schema into SQL Editor → Run:

```sql
-- Full schema (from schema.sql)
create table if not exists profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null,
  is_ai_companion boolean default false,
  created_at  timestamptz default now()
);

create table if not exists questions (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text not null,
  author_id           uuid references profiles(id) on delete cascade not null,
  allow_ai_companion  boolean default false,
  is_solved           boolean default false,
  vote_count          integer default 0,
  created_at          timestamptz default now()
);

create table if not exists tags (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
);

create table if not exists question_tags (
  question_id uuid references questions(id) on delete cascade,
  tag_id      uuid references tags(id) on delete cascade,
  primary key (question_id, tag_id)
);

create table if not exists answers (
  id               uuid primary key default gen_random_uuid(),
  question_id      uuid references questions(id) on delete cascade not null,
  author_id        uuid references profiles(id) on delete cascade not null,
  body             text not null,
  is_accepted      boolean default false,
  is_ai_generated  boolean default false,
  vote_count       integer default 0,
  created_at       timestamptz default now()
);

create table if not exists votes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade not null,
  target_id    uuid not null,
  target_type  text check (target_type in ('question', 'answer')) not null,
  value        integer check (value in (1, -1)) not null,
  unique (user_id, target_id)
);

create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references profiles(id) on delete cascade not null,
  target_id    uuid not null,
  target_type  text check (target_type in ('question', 'answer')) not null,
  body         text not null,
  created_at   timestamptz default now()
);
```

Walk through briefly — they know model from whiteboard.

### Atomicity + Race Conditions (≈10 min) 🧑‍🏫 WHITEBOARD

**DRAW:**
```
User A: read vote_count=5 → write 6
User B: read vote_count=5 → write 6
                                    ↓
                        Result: 6 ← WRONG! Should be 7
```

**SAY:** "Two reads same value, both +1, both write 6. One vote lost. = RACE CONDITION."

**Fix:** DB fn that reads+writes in single atomic op:

```sql
create or replace function increment_question_votes(q_id uuid, delta integer)
returns void as $$
  update questions set vote_count = vote_count + delta where id = q_id;
$$ language sql;

create or replace function increment_answer_votes(a_id uuid, delta integer)
returns void as $$
  update answers set vote_count = vote_count + delta where id = a_id;
$$ language sql;
```

Run these in SQL Editor.

**SAY:** "Fn runs INSIDE DB. `vote_count + delta` = one step. No one sneaks in between. = ATOMIC."

**Broader concept:** Multiple ops must succeed/fail together → TRANSACTION. Bank transfer: debit one account + credit another. Can't do half. We'll see this Lab 6.

### Verify

Table Editor → confirm 7 tables exist. Insert row into `profiles` via UI → appears → delete it. DB alive. ✓

---

## 4. Row Level Security (≈20 min) 🧑‍🏫 WHITEBOARD + SQL EDITOR

### Concept (whiteboard, ≈10 min)

**SAY:** "Right now anyone w/ URL + anon key → read/write everything. RLS disabled. Fix:"

Mental model:
- RLS enabled → **all access denied by default**
- Policies = SQL expressions granting access per-row
- Policy ≈ WHERE clause DB appends to every query automatically
- `auth.uid()` → current user's UUID from JWT

**DRAW:**
```
Browser (JWT) → Supabase API → Postgres
                                  ↓
                          Policy check:
                          "Can this user
                           do this op on
                           this row?"
                                  ↓
                          YES → data
                          NO  → empty / error
```

**Two keys:**

| Key | Through RLS? | Use |
|---|---|---|
| `anon` (public) | ✅ Yes | Frontend/browser |
| `service_role` | ❌ Bypasses | Backend only |

⚠️ **NEVER expose service_role in browser code**

### Live (SQL Editor, ≈10 min)

```sql
-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "questions_select" ON questions
  FOR SELECT USING (true);

-- Only auth'd users can insert as themselves
CREATE POLICY "questions_insert" ON questions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Only author can update
CREATE POLICY "questions_update" ON questions
  FOR UPDATE USING (auth.uid() = author_id);

-- Only author can delete
CREATE POLICY "questions_delete" ON questions
  FOR DELETE USING (auth.uid() = author_id);
```

### Exercise

**ASK:** "Write RLS for `answers`: anyone reads, auth'd users insert (as self), only author deletes."

→ Solution:
```sql
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers_select" ON answers
  FOR SELECT USING (true);

CREATE POLICY "answers_insert" ON answers
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "answers_delete" ON answers
  FOR DELETE USING (auth.uid() = author_id);
```

**SAY:** "Frontend uses anon key → RLS protects. Without policies, malicious user could delete anyone's questions."

---

## 5. Supabase Client + Auth (≈20 min)

### Install + Config

```bash
cd smo-frontend
npm install @supabase/supabase-js
```

Create `src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

`.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Get from: Supabase Dashboard → Project Settings → API

⚠️ **publishable key, NOT service_role key**. Safe in browser bc RLS protects.

⚠️ **Vite env vars MUST start with `VITE_`** or invisible to browser.

### Auth Wiring

`SignUp.tsx`:
```ts
const { data, error } = await supabase.auth.signUp({ email, password })

// After signup → insert profile
if (data.user) {
  await supabase.from('profiles').insert({
    id: data.user.id,
    username: chosenUsername
  })
}
```

`SignIn.tsx`:
```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

`useAuth.tsx` — listen to auth state:
```ts
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

### Verify ✓

1. Register via frontend form
2. Supabase Auth dashboard → user appears
3. `profiles` table → row exists
4. Log in → refresh page → still logged in (Supabase handles token persistence)

---

## 6. Wire Questions from Supabase (≈15 min)

Replace mock data in `Home.tsx`:

```ts
const { data: questions } = await supabase
  .from('questions')
  .select(`
    *,
    author:profiles!author_id(username),
    question_tags(tag:tags(name))
  `)
  .order('created_at', { ascending: false })
```

**Explain select syntax:**
- `profiles!author_id(username)` = LEFT JOIN on profiles via author_id FK, return username only
- `question_tags(tag:tags(name))` = join through junction table to get tag names
- Same as SQL JOINs from board, different syntax

Show response shape. May need flattening for components.

If time: wire `AskQuestion.tsx` to insert question + tags. If not → homework.

### Verify ✓

Add question via form → refresh → still there → close browser → reopen → still there.

**SAY:** "Data persists. This is the moment."

---

## End State

```
smo-frontend/
  src/
    lib/supabase.ts       ← client (anon key)
    hooks/useAuth.tsx     ← real auth via supabase.auth
    pages/
      Home.tsx            ← fetches from Supabase
      SignIn.tsx           ← supabase.auth.signInWithPassword
      SignUp.tsx           ← supabase.auth.signUp + profile insert
  .env                    ← VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY

Supabase:
  ✓ 7 tables + 2 atomic fns
  ✓ RLS on questions (minimum)
  ✓ 1+ registered user w/ profile
```

No backend yet. Frontend → Supabase directly. Persistence ✓. Auth ✓. RLS ✓.

---

## ⚠️ Common Issues

| Problem | Cause → Fix |
|---|---|
| Queries return `[]` | RLS enabled but no SELECT policy → add `FOR SELECT USING (true)` |
| `auth.uid()` = null | User not logged in / JWT not sent → check active session |
| Profile insert fails after signup | UUID mismatch → use `data.user.id` |
| Env vars undefined | Missing `VITE_` prefix → rename vars |
| Anon vs service_role confusion | Frontend = anon (goes through RLS). Backend = service_role (bypasses) |
| Supabase select syntax confusing | Relate back to SQL JOINs from board — same concept |
| Projects slow to create | Start creation during SQL exercises section |
