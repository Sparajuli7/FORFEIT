-- ==========================================================================
-- Storage bucket RLS policies for proofs and shame buckets
-- ==========================================================================
-- The proofs and shame storage buckets need RLS policies to allow
-- authenticated users to upload and read files.
--
-- Run this in the Supabase SQL Editor.
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- Ensure buckets exist and are public (so public URLs work)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('shame', 'shame', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---------------------------------------------------------------------------
-- Drop existing storage policies to start clean
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname LIKE '%proofs%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname LIKE '%shame%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Proofs bucket policies
-- ---------------------------------------------------------------------------

-- Authenticated users can upload to the proofs bucket
CREATE POLICY "Authenticated users can upload proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'proofs');

-- Authenticated users can update (upsert) files in the proofs bucket
CREATE POLICY "Authenticated users can update proofs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'proofs');

-- Anyone can read proof files (public bucket)
CREATE POLICY "Public read access for proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'proofs');

-- Users can delete their own proof files
CREATE POLICY "Users can delete own proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'proofs' AND (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Shame bucket policies
-- ---------------------------------------------------------------------------

-- Authenticated users can upload to the shame bucket
CREATE POLICY "Authenticated users can upload shame"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'shame');

-- Authenticated users can update (upsert) files in the shame bucket
CREATE POLICY "Authenticated users can update shame"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shame');

-- Anyone can read shame files (public bucket)
CREATE POLICY "Public read access for shame"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'shame');

-- Users can delete their own shame files
CREATE POLICY "Users can delete own shame"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'shame' AND (storage.foldername(name))[1] = auth.uid()::text);
