-- =============================================================================
-- Stack My Overflow — Reset Database
-- Run this in the Supabase SQL Editor to drop everything and start fresh.
-- After running this, run schema.sql again, then optionally seed.sql.
-- =============================================================================

-- Drop all policies first (RLS policies block table drops)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS increment_question_votes (uuid, integer);

DROP FUNCTION IF EXISTS increment_answer_votes (uuid, integer);

DROP FUNCTION IF EXISTS increment_reputation (uuid, integer);

-- Drop tables in dependency order (children first, then parents)
DROP TABLE IF EXISTS comments CASCADE;

DROP TABLE IF EXISTS votes CASCADE;

DROP TABLE IF EXISTS question_tags CASCADE;

DROP TABLE IF EXISTS answers CASCADE;

DROP TABLE IF EXISTS questions CASCADE;

DROP TABLE IF EXISTS tags CASCADE;

DROP TABLE IF EXISTS profiles CASCADE;

-- Confirm
SELECT 'Database reset complete. Run schema.sql to recreate.' AS status;