-- ==========================================================================
-- RLS policies for proof_votes and proofs tables
-- ==========================================================================
-- Without these policies, authenticated users cannot read or insert votes.
-- Run this in the Supabase SQL Editor.
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on proof_votes (may already be enabled)
-- ---------------------------------------------------------------------------
ALTER TABLE proof_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'proof_votes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.proof_votes', pol.policyname);
  END LOOP;
END $$;

-- Any authenticated user can read all votes (votes are not private)
CREATE POLICY "Anyone can read votes"
  ON proof_votes FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert own votes"
  ON proof_votes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own votes (for upsert to work)
CREATE POLICY "Users can update own votes"
  ON proof_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Enable RLS on proofs table (may already be enabled)
-- ---------------------------------------------------------------------------
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'proofs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.proofs', pol.policyname);
  END LOOP;
END $$;

-- Any authenticated user can read all proofs
CREATE POLICY "Anyone can read proofs"
  ON proofs FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own proofs
CREATE POLICY "Users can insert own proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

-- Users can update their own proofs (for caption editing)
CREATE POLICY "Users can update own proofs"
  ON proofs FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid());
