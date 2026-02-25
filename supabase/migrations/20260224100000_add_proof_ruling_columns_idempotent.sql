-- Idempotent: add ruling and ruling_deadline to proofs if missing.
-- Fixes: "Could not find the 'ruling' column of 'proofs' in the schema cache"
-- Run this in Supabase SQL Editor if you get that error when declaring a verdict.

ALTER TABLE proofs ADD COLUMN IF NOT EXISTS ruling TEXT;
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS ruling_deadline TIMESTAMPTZ;

-- Constraint: allow NULL (evidence-only) or 'riders_win' / 'doubters_win'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proofs_ruling_check') THEN
    ALTER TABLE proofs ADD CONSTRAINT proofs_ruling_check
    CHECK (ruling IS NULL OR ruling IN ('riders_win', 'doubters_win'));
  END IF;
END $$;

COMMENT ON COLUMN proofs.ruling IS
  'Claimant verdict: riders_win (YES) or doubters_win (NO). NULL for evidence-only proofs.';
COMMENT ON COLUMN proofs.ruling_deadline IS
  'Timestamp when the 24-hour community vote window closes. Set when ruling is submitted.';
