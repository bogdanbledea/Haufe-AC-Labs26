-- =============================================================================
-- Stack My Overflow — Query Examples
-- Run these in the Supabase SQL Editor after schema.sql + seed.sql.
-- Use these to demonstrate concepts on the board, then run live.
-- =============================================================================

-- ===========================================================================
-- BASIC SELECTS
-- ===========================================================================

-- All questions
SELECT * FROM questions;

-- All questions, most recent first
SELECT * FROM questions ORDER BY created_at DESC;

-- Only unsolved questions
SELECT * FROM questions WHERE is_solved = false;

-- Questions with more than 10 votes
SELECT title, vote_count FROM questions WHERE vote_count > 10;

-- Count total questions
SELECT COUNT(*) AS total_questions FROM questions;

-- ===========================================================================
-- FILTERING + PATTERN MATCHING
-- ===========================================================================

-- Questions whose title contains "React"
SELECT title FROM questions WHERE title ILIKE '%react%';

-- Questions created in the last 3 days
SELECT title, created_at
FROM questions
WHERE
    created_at > now() - interval '3 days';

-- Profiles with reputation above 100
SELECT username, reputation FROM profiles WHERE reputation > 100;

-- ===========================================================================
-- JOINS — INNER JOIN
-- ===========================================================================

-- Questions with their author's username
SELECT q.title, p.username AS author
FROM questions q
    INNER JOIN profiles p ON q.author_id = p.id;

-- Answers with the question title and answer author
SELECT
    q.title AS question,
    a.body AS answer,
    p.username AS answered_by
FROM
    answers a
    INNER JOIN questions q ON a.question_id = q.id
    INNER JOIN profiles p ON a.author_id = p.id;

-- Questions with their tags (multiple rows per question if multiple tags)
SELECT q.title, t.name AS tag
FROM
    questions q
    JOIN question_tags qt ON qt.question_id = q.id
    JOIN tags t ON qt.tag_id = t.id;

-- ===========================================================================
-- JOINS — LEFT JOIN
-- ===========================================================================

-- All questions with answer count (including questions with 0 answers)
SELECT q.title, COUNT(a.id) AS answer_count
FROM questions q
    LEFT JOIN answers a ON a.question_id = q.id
GROUP BY
    q.id,
    q.title
ORDER BY answer_count DESC;

-- All profiles with their question count (including users who never asked)
SELECT p.username, COUNT(q.id) AS questions_asked
FROM profiles p
    LEFT JOIN questions q ON q.author_id = p.id
GROUP BY
    p.id,
    p.username
ORDER BY questions_asked DESC;

-- ===========================================================================
-- AGGREGATES + GROUP BY
-- ===========================================================================

-- How many questions does each user have?
SELECT p.username, COUNT(q.id) AS question_count
FROM profiles p
    LEFT JOIN questions q ON q.author_id = p.id
GROUP BY
    p.id,
    p.username;

-- Average vote count per question
SELECT ROUND(AVG(vote_count), 1) AS avg_votes FROM questions;

-- Total votes cast per user
SELECT p.username, COUNT(v.id) AS votes_cast
FROM profiles p
    LEFT JOIN votes v ON v.user_id = p.id
GROUP BY
    p.id,
    p.username
ORDER BY votes_cast DESC;

-- Tags ranked by usage (how many questions use each tag)
SELECT t.name, COUNT(qt.question_id) AS times_used
FROM tags t
    LEFT JOIN question_tags qt ON qt.tag_id = t.id
GROUP BY
    t.id,
    t.name
ORDER BY times_used DESC;

-- ===========================================================================
-- SUBQUERIES
-- ===========================================================================

-- Questions by the user with the highest reputation
SELECT title
FROM questions
WHERE
    author_id = (
        SELECT id
        FROM profiles
        ORDER BY reputation DESC
        LIMIT 1
    );

-- Questions that have no answers yet
SELECT title
FROM questions
WHERE
    id NOT IN(
        SELECT DISTINCT
            question_id
        FROM answers
    );

-- Users who have never asked a question
SELECT username
FROM profiles
WHERE
    id NOT IN(
        SELECT DISTINCT
            author_id
        FROM questions
    );

-- ===========================================================================
-- MULTI-TABLE JOINS (putting it all together)
-- ===========================================================================

-- Full question view: title, author, tags, answer count, comment count
SELECT
    q.title,
    p.username AS author,
    q.vote_count,
    q.is_solved,
    COUNT(DISTINCT a.id) AS answer_count,
    COUNT(DISTINCT c.id) AS comment_count,
    ARRAY_AGG (DISTINCT t.name) FILTER (
        WHERE
            t.name IS NOT NULL
    ) AS tags
FROM
    questions q
    JOIN profiles p ON q.author_id = p.id
    LEFT JOIN answers a ON a.question_id = q.id
    LEFT JOIN comments c ON c.target_id = q.id
    AND c.target_type = 'question'
    LEFT JOIN question_tags qt ON qt.question_id = q.id
    LEFT JOIN tags t ON qt.tag_id = t.id
GROUP BY
    q.id,
    q.title,
    p.username,
    q.vote_count,
    q.is_solved
ORDER BY q.created_at DESC;

-- Leaderboard: users ranked by reputation, with their activity stats
SELECT
    p.username,
    p.reputation,
    COUNT(DISTINCT q.id) AS questions_asked,
    COUNT(DISTINCT a.id) AS answers_given,
    COUNT(DISTINCT v.id) AS votes_cast
FROM
    profiles p
    LEFT JOIN questions q ON q.author_id = p.id
    LEFT JOIN answers a ON a.author_id = p.id
    LEFT JOIN votes v ON v.user_id = p.id
GROUP BY
    p.id,
    p.username,
    p.reputation
ORDER BY p.reputation DESC;

-- ===========================================================================
-- EXERCISES FOR STUDENTS (try before looking at solutions below)
-- ===========================================================================

-- Exercise 1: Get all answers for the question "How do SQL joins work?",
--             including the answer author's username.

-- Exercise 2: Find which user has given the most answers.

-- Exercise 3: Get all questions tagged "javascript" with their author's username.

-- Exercise 4: Find questions where the accepted answer was NOT written by
--             the question author (i.e., someone else solved it).

-- Exercise 5: Get the total upvotes and downvotes received per user
--             (across their questions and answers).

-- ===========================================================================
-- SOLUTIONS (don't show until students have tried!)
-- ===========================================================================

-- Solution 1
SELECT a.body, p.username AS answered_by
FROM answers a
    JOIN profiles p ON a.author_id = p.id
WHERE
    a.question_id = (
        SELECT id
        FROM questions
        WHERE
            title = 'How do SQL joins work?'
    );

-- Solution 2
SELECT p.username, COUNT(a.id) AS answer_count
FROM profiles p
    JOIN answers a ON a.author_id = p.id
GROUP BY
    p.id,
    p.username
ORDER BY answer_count DESC
LIMIT 1;

-- Solution 3
SELECT q.title, p.username AS author
FROM
    questions q
    JOIN profiles p ON q.author_id = p.id
    JOIN question_tags qt ON qt.question_id = q.id
    JOIN tags t ON qt.tag_id = t.id
WHERE
    t.name = 'javascript';

-- Solution 4
SELECT q.title, pq.username AS asked_by, pa.username AS solved_by
FROM
    questions q
    JOIN answers a ON a.question_id = q.id
    AND a.is_accepted = true
    JOIN profiles pq ON q.author_id = pq.id
    JOIN profiles pa ON a.author_id = pa.id
WHERE
    q.author_id != a.author_id;

-- Solution 5
SELECT
    p.username,
    COALESCE(
        SUM(
            CASE
                WHEN v.value = 1 THEN 1
                ELSE 0
            END
        ),
        0
    ) AS upvotes_received,
    COALESCE(
        SUM(
            CASE
                WHEN v.value = -1 THEN 1
                ELSE 0
            END
        ),
        0
    ) AS downvotes_received
FROM
    profiles p
    LEFT JOIN questions q ON q.author_id = p.id
    LEFT JOIN answers a ON a.author_id = p.id
    LEFT JOIN votes v ON (
        v.target_id = q.id
        AND v.target_type = 'question'
    )
    OR (
        v.target_id = a.id
        AND v.target_type = 'answer'
    )
GROUP BY
    p.id,
    p.username
ORDER BY upvotes_received DESC;