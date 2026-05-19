-- =============================================================================
-- Stack My Overflow — Full Schema
-- Run this in the Supabase SQL Editor after creating your project.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- One row per authenticated user. Linked to Supabase Auth via auth.users(id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
    username text UNIQUE NOT NULL,
    reputation integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. QUESTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    title text NOT NULL,
    description text NOT NULL,
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    is_solved boolean DEFAULT false,
    vote_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. TAGS + JUNCTION TABLE (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS question_tags (
    question_id uuid REFERENCES questions (id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- 4. ANSWERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    question_id uuid REFERENCES questions (id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    body text NOT NULL,
    is_accepted boolean DEFAULT false,
    vote_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. VOTES
-- Tracks individual votes. One vote per (user, target) pair.
-- value is 1 (upvote) or -1 (downvote).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    target_id uuid NOT NULL,
    target_type text CHECK (
        target_type IN ('question', 'answer')
    ) NOT NULL,
    value integer CHECK (value IN (1, -1)) NOT NULL,
    UNIQUE (user_id, target_id)
);

-- ---------------------------------------------------------------------------
-- 6. COMMENTS
-- Can target either a question or an answer (polymorphic via target_type).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    target_id uuid NOT NULL,
    target_type text CHECK (
        target_type IN ('question', 'answer')
    ) NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. ATOMIC FUNCTIONS
-- These avoid read-modify-write race conditions on counters.
-- The database reads and writes in one step — no one can sneak in between.
-- ---------------------------------------------------------------------------

-- Increment/decrement question vote count
CREATE OR REPLACE FUNCTION increment_question_votes(q_id uuid, delta integer)
RETURNS void AS $$
  UPDATE questions SET vote_count = vote_count + delta WHERE id = q_id;
$$ LANGUAGE sql;

-- Increment/decrement answer vote count
CREATE OR REPLACE FUNCTION increment_answer_votes(a_id uuid, delta integer)
RETURNS void AS $$
  UPDATE answers SET vote_count = vote_count + delta WHERE id = a_id;
$$ LANGUAGE sql;

-- Increment user reputation (used when an answer is accepted)
CREATE OR REPLACE FUNCTION increment_reputation(user_id uuid, points integer)
RETURNS void AS $$
  UPDATE profiles SET reputation = reputation + points WHERE id = user_id;
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- Protects data when accessed via the anon key (frontend → Supabase directly).
-- ---------------------------------------------------------------------------

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR
SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles FOR
INSERT
WITH
    CHECK (auth.uid () = id);

CREATE POLICY "profiles_update" ON profiles FOR
UPDATE USING (auth.uid () = id);

-- QUESTIONS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select" ON questions FOR
SELECT USING (true);

CREATE POLICY "questions_insert" ON questions FOR
INSERT
WITH
    CHECK (auth.uid () = author_id);

CREATE POLICY "questions_update" ON questions FOR
UPDATE USING (auth.uid () = author_id);

CREATE POLICY "questions_delete" ON questions FOR DELETE USING (auth.uid () = author_id);

-- TAGS (read-only for everyone, insert for authenticated)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select" ON tags FOR SELECT USING (true);

CREATE POLICY "tags_insert" ON tags FOR
INSERT
WITH
    CHECK (auth.uid () IS NOT NULL);

-- QUESTION_TAGS
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_tags_select" ON question_tags FOR
SELECT USING (true);

CREATE POLICY "question_tags_insert" ON question_tags FOR
INSERT
WITH
    CHECK (auth.uid () IS NOT NULL);

-- ANSWERS
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers_select" ON answers FOR SELECT USING (true);

CREATE POLICY "answers_insert" ON answers FOR
INSERT
WITH
    CHECK (auth.uid () = author_id);

CREATE POLICY "answers_update" ON answers FOR
UPDATE USING (auth.uid () = author_id);

CREATE POLICY "answers_delete" ON answers FOR DELETE USING (auth.uid () = author_id);

-- VOTES
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);

CREATE POLICY "votes_insert" ON votes FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "votes_update" ON votes FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "votes_delete" ON votes FOR DELETE USING (auth.uid () = user_id);

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON comments FOR
SELECT USING (true);

CREATE POLICY "comments_insert" ON comments FOR
INSERT
WITH
    CHECK (auth.uid () = author_id);

CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid () = author_id);