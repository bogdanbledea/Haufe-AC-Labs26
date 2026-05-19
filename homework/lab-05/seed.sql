-- =============================================================================
-- Stack My Overflow — Seed Data
-- Run this AFTER schema.sql to populate the database with sample data.
--
-- NOTE: These profiles use hardcoded UUIDs that do NOT correspond to real
-- Supabase Auth users. We insert stub rows into auth.users so the FK
-- constraint on profiles is satisfied.
-- For the frontend auth flow, students will register real users.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- AUTH USERS (stub rows so profiles FK constraint is satisfied)
-- ---------------------------------------------------------------------------
INSERT INTO
    auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
        'authenticated',
        'authenticated',
        'alice@example.com',
        crypt (
            'password123',
            gen_salt ('bf')
        ),
        now(),
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '22222222-2222-2222-2222-222222222222',
        'authenticated',
        'authenticated',
        'bob@example.com',
        crypt (
            'password123',
            gen_salt ('bf')
        ),
        now(),
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '33333333-3333-3333-3333-333333333333',
        'authenticated',
        'authenticated',
        'carol@example.com',
        crypt (
            'password123',
            gen_salt ('bf')
        ),
        now(),
        now(),
        now(),
        '',
        '',
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '44444444-4444-4444-4444-444444444444',
        'authenticated',
        'authenticated',
        'dave@example.com',
        crypt (
            'password123',
            gen_salt ('bf')
        ),
        now(),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
INSERT INTO
    profiles (id, username, reputation)
VALUES (
        '11111111-1111-1111-1111-111111111111',
        'alice',
        120
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'bob',
        45
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'carol',
        230
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'dave',
        10
    );

-- ---------------------------------------------------------------------------
-- TAGS
-- ---------------------------------------------------------------------------
INSERT INTO
    tags (id, name)
VALUES (
        'aaaa0001-0000-0000-0000-000000000000',
        'javascript'
    ),
    (
        'aaaa0002-0000-0000-0000-000000000000',
        'react'
    ),
    (
        'aaaa0003-0000-0000-0000-000000000000',
        'css'
    ),
    (
        'aaaa0004-0000-0000-0000-000000000000',
        'node.js'
    ),
    (
        'aaaa0005-0000-0000-0000-000000000000',
        'sql'
    ),
    (
        'aaaa0006-0000-0000-0000-000000000000',
        'typescript'
    );

-- ---------------------------------------------------------------------------
-- QUESTIONS
-- ---------------------------------------------------------------------------
INSERT INTO
    questions (
        id,
        title,
        description,
        author_id,
        is_solved,
        vote_count,
        created_at
    )
VALUES (
        'q0000001-0000-0000-0000-000000000000',
        'How do I center a div?',
        'I have tried margin: auto and flexbox but nothing works. The div stays stuck to the left. What am I missing?',
        '11111111-1111-1111-1111-111111111111',
        true,
        12,
        now() - interval '7 days'
    ),
    (
        'q0000002-0000-0000-0000-000000000000',
        'What is the difference between let and const?',
        'I know var is old, but when should I use let vs const? Is there a performance difference?',
        '22222222-2222-2222-2222-222222222222',
        false,
        8,
        now() - interval '5 days'
    ),
    (
        'q0000003-0000-0000-0000-000000000000',
        'How do SQL joins work?',
        'I understand SELECT and WHERE, but joins confuse me. Can someone explain INNER JOIN vs LEFT JOIN with a simple example?',
        '33333333-3333-3333-3333-333333333333',
        false,
        15,
        now() - interval '3 days'
    ),
    (
        'q0000004-0000-0000-0000-000000000000',
        'Why does useEffect run twice in React 18?',
        'My useEffect fires twice on mount in development. Is this a bug? How do I fix it?',
        '11111111-1111-1111-1111-111111111111',
        true,
        22,
        now() - interval '1 day'
    ),
    (
        'q0000005-0000-0000-0000-000000000000',
        'Best way to handle authentication in Express?',
        'I am building a REST API with Express. Should I use sessions, JWTs, or something else? What are the tradeoffs?',
        '44444444-4444-4444-4444-444444444444',
        false,
        5,
        now() - interval '12 hours'
    );

-- ---------------------------------------------------------------------------
-- QUESTION_TAGS (many-to-many)
-- ---------------------------------------------------------------------------
INSERT INTO
    question_tags (question_id, tag_id)
VALUES (
        'q0000001-0000-0000-0000-000000000000',
        'aaaa0003-0000-0000-0000-000000000000'
    ), -- css
    (
        'q0000002-0000-0000-0000-000000000000',
        'aaaa0001-0000-0000-0000-000000000000'
    ), -- javascript
    (
        'q0000003-0000-0000-0000-000000000000',
        'aaaa0005-0000-0000-0000-000000000000'
    ), -- sql
    (
        'q0000004-0000-0000-0000-000000000000',
        'aaaa0002-0000-0000-0000-000000000000'
    ), -- react
    (
        'q0000004-0000-0000-0000-000000000000',
        'aaaa0001-0000-0000-0000-000000000000'
    ), -- javascript
    (
        'q0000005-0000-0000-0000-000000000000',
        'aaaa0004-0000-0000-0000-000000000000'
    ), -- node.js
    (
        'q0000005-0000-0000-0000-000000000000',
        'aaaa0006-0000-0000-0000-000000000000'
    );
-- typescript

-- ---------------------------------------------------------------------------
-- ANSWERS
-- ---------------------------------------------------------------------------
INSERT INTO
    answers (
        id,
        question_id,
        author_id,
        body,
        is_accepted,
        vote_count,
        created_at
    )
VALUES (
        'a0000001-0000-0000-0000-000000000000',
        'q0000001-0000-0000-0000-000000000000',
        '33333333-3333-3333-3333-333333333333',
        'Use flexbox on the parent: display: flex; justify-content: center; align-items: center; and make sure the parent has a height.',
        true,
        8,
        now() - interval '6 days'
    ),
    (
        'a0000002-0000-0000-0000-000000000000',
        'q0000001-0000-0000-0000-000000000000',
        '22222222-2222-2222-2222-222222222222',
        'You can also use CSS Grid: display: grid; place-items: center; — even shorter.',
        false,
        5,
        now() - interval '6 days'
    ),
    (
        'a0000003-0000-0000-0000-000000000000',
        'q0000003-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
        'INNER JOIN returns only rows that match in both tables. LEFT JOIN returns all rows from the left table, and NULLs where there is no match on the right. Think of it as: INNER = intersection, LEFT = everything from left + matches from right.',
        false,
        10,
        now() - interval '2 days'
    ),
    (
        'a0000004-0000-0000-0000-000000000000',
        'q0000004-0000-0000-0000-000000000000',
        '44444444-4444-4444-4444-444444444444',
        'It is not a bug — React 18 Strict Mode intentionally double-invokes effects in development to help you find missing cleanup functions. It does not happen in production. Add a cleanup function to your useEffect if it causes issues.',
        true,
        14,
        now() - interval '20 hours'
    ),
    (
        'a0000005-0000-0000-0000-000000000000',
        'q0000005-0000-0000-0000-000000000000',
        '33333333-3333-3333-3333-333333333333',
        'JWTs are the standard for stateless REST APIs. The server issues a signed token on login, the client sends it with every request. No server-side session storage needed. Downside: you cannot revoke a JWT before it expires without extra infrastructure.',
        false,
        3,
        now() - interval '10 hours'
    );

-- ---------------------------------------------------------------------------
-- VOTES
-- ---------------------------------------------------------------------------
INSERT INTO
    votes (
        user_id,
        target_id,
        target_type,
        value
    )
VALUES (
        '22222222-2222-2222-2222-222222222222',
        'q0000001-0000-0000-0000-000000000000',
        'question',
        1
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'q0000001-0000-0000-0000-000000000000',
        'question',
        1
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'q0000003-0000-0000-0000-000000000000',
        'question',
        1
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'q0000004-0000-0000-0000-000000000000',
        'question',
        1
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'a0000001-0000-0000-0000-000000000000',
        'answer',
        1
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'a0000003-0000-0000-0000-000000000000',
        'answer',
        1
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'a0000004-0000-0000-0000-000000000000',
        'answer',
        1
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'a0000004-0000-0000-0000-000000000000',
        'answer',
        1
    );

-- ---------------------------------------------------------------------------
-- COMMENTS
-- ---------------------------------------------------------------------------
INSERT INTO
    comments (
        author_id,
        target_id,
        target_type,
        body,
        created_at
    )
VALUES (
        '22222222-2222-2222-2222-222222222222',
        'q0000003-0000-0000-0000-000000000000',
        'question',
        'Great question! I struggled with this too when I started.',
        now() - interval '2 days'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'a0000001-0000-0000-0000-000000000000',
        'answer',
        'This works perfectly. Just make sure the parent has height: 100vh if you want full-page centering.',
        now() - interval '5 days'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'a0000005-0000-0000-0000-000000000000',
        'answer',
        'What about refresh tokens? Do you store them in localStorage or httpOnly cookies?',
        now() - interval '8 hours'
    );