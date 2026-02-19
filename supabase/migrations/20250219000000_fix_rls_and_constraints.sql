-- ==========================================================================
-- Fix infinite recursion in group_members RLS + add missing unique constraints
-- ==========================================================================
-- Problem: The existing RLS policies on group_members reference group_members
-- in their USING clause, causing infinite recursion when Postgres evaluates
-- the policy during INSERT/SELECT/DELETE.
--
-- Solution: Replace with policies that don't self-reference. Instead:
--   - INSERT: Any authenticated user can insert a row where user_id = their own uid
--   - SELECT: Users can read rows where user_id = their uid, OR rows in groups they belong to
--     (using a security-definer helper function to bypass RLS for the membership check)
--   - DELETE: Users can delete their own membership rows
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- Step 1: Create a SECURITY DEFINER helper to check group membership
--         without triggering RLS on group_members (breaks the recursion).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER          -- runs as table owner, bypasses RLS
SET search_path = public  -- prevent search_path injection
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Step 2: Drop ALL existing policies on group_members to start clean
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'group_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.group_members', pol.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Step 3: Create non-recursive policies
-- ---------------------------------------------------------------------------

-- Users can read their own membership rows (no recursion — simple uid check)
CREATE POLICY "Users can read own memberships"
  ON group_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can read other members of groups they belong to
-- Uses the SECURITY DEFINER function so this doesn't recurse
CREATE POLICY "Users can read fellow group members"
  ON group_members FOR SELECT
  USING (public.is_group_member(group_id, auth.uid()));

-- Any authenticated user can insert a membership row for themselves
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own membership
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- Group admins can remove members (uses helper to check admin role)
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = p_user_id
      AND role     = 'admin'
  );
$$;

CREATE POLICY "Admins can remove group members"
  ON group_members FOR DELETE
  USING (public.is_group_admin(group_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Step 4: Add unique constraints to prevent race-condition duplicates
-- ---------------------------------------------------------------------------

-- Prevent a user from joining the same bet side twice
ALTER TABLE bet_sides
  ADD CONSTRAINT uq_bet_sides_bet_user UNIQUE (bet_id, user_id);

-- Prevent a user from joining the same group twice
ALTER TABLE group_members
  ADD CONSTRAINT uq_group_members_group_user UNIQUE (group_id, user_id);

-- Prevent duplicate proof votes (one vote per user per proof)
ALTER TABLE proof_votes
  ADD CONSTRAINT uq_proof_votes_proof_user UNIQUE (proof_id, user_id);
