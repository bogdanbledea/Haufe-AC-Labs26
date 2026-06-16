-- =============================================================================
-- Stack My Overflow — Full Schema + Lab 8 migration
-- Run this once in the Supabase SQL Editor on a fresh project.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES
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
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    is_solved boolean DEFAULT false,
    vote_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. TAGS + JUNCTION TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS question_tags (
    question_id uuid REFERENCES questions (id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- 4. ANSWERS
-- is_ai_generated: true for answers posted by the AI Companion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES questions (id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    body text NOT NULL,
    is_accepted boolean DEFAULT false,

    vote_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. VOTES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    target_id uuid NOT NULL,
    target_type text CHECK (target_type IN ('question', 'answer')) NOT NULL,
    value integer CHECK (value IN (1, -1)) NOT NULL,
    UNIQUE (user_id, target_id)
);

-- ---------------------------------------------------------------------------
-- 6. COMMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES profiles (id) ON DELETE CASCADE NOT NULL,
    target_id uuid NOT NULL,
    target_type text CHECK (target_type IN ('question', 'answer')) NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. ATOMIC VOTE FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_question_votes(q_id uuid, delta integer)
RETURNS void AS $$
  UPDATE questions SET vote_count = vote_count + delta WHERE id = q_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_answer_votes(a_id uuid, delta integer)
RETURNS void AS $$
  UPDATE answers SET vote_count = vote_count + delta WHERE id = a_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_reputation(user_id uuid, points integer)
RETURNS void AS $$
  UPDATE profiles SET reputation = reputation + points WHERE id = user_id;
$$ LANGUAGE sql;

-- ---------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select" ON questions FOR SELECT USING (true);
CREATE POLICY "questions_insert" ON questions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "questions_update" ON questions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "questions_delete" ON questions FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_select" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_insert" ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_tags_select" ON question_tags FOR SELECT USING (true);
CREATE POLICY "question_tags_insert" ON question_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_select" ON answers FOR SELECT USING (true);
CREATE POLICY "answers_insert" ON answers FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "answers_update" ON answers FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "answers_delete" ON answers FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update" ON votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON votes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE answers ADD COLUMN quality_badge text CHECK (quality_badge IN ('helpful', 'needs-detail', 'off-topic'));

-- 1. Add the summary column directly to your existing questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS summary text DEFAULT NULL;

-- 2. Create the trigger function that detects edits and clears the summary
CREATE OR REPLACE FUNCTION clear_question_summary_on_edit()
RETURNS TRIGGER AS $$
BEGIN
-- Only clear the summary if the title or description actually changed
IF (OLD.title IS DISTINCT FROM NEW.title) OR (OLD.description IS DISTINCT FROM NEW.description) THEN
NEW.summary := NULL;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the trigger to run BEFORE any update happens on the questions table
CREATE TRIGGER tr_clear_question_summary
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION clear_question_summary_on_edit();

-- 1. Create a trigger function that clears the summary when a comment changes
CREATE OR REPLACE FUNCTION clear_question_summary_on_comment_edit()
RETURNS TRIGGER AS $$
BEGIN
-- We only care if the comment body actually changed
IF (OLD.body IS DISTINCT FROM NEW.body) THEN

-- CASE 1: The comment was directly on a question
IF NEW.target_type = 'question' THEN
UPDATE questions
SET summary = NULL
WHERE id = NEW.target_id;

-- CASE 2: The comment was on an answer
-- (Since the summary includes the top answer, changing an answer's comment affects the context!)
ELSIF NEW.target_type = 'answer' THEN
UPDATE questions
SET summary = NULL
WHERE id = (SELECT question_id FROM answers WHERE id = NEW.target_id);
END IF;

END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Bind the trigger to the comments table
CREATE TRIGGER tr_clear_question_summary_on_comment
AFTER UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION clear_question_summary_on_comment_edit();