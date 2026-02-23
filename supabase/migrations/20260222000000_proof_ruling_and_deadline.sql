-- Add ruling declaration and 24-hour voting deadline to proofs
--
-- ruling:          set by the claimant when they submit the final verdict
--                  'riders_win' = YES (challenge completed)
--                  'doubters_win' = NO (challenge failed)
--                  NULL on regular evidence proofs submitted by any participant
--
-- ruling_deadline: ruling_submitted_at + 24h — voting window closes here.
--                  Only set when ruling IS NOT NULL.

ALTER TABLE proofs
  ADD COLUMN ruling TEXT CHECK (ruling IN ('riders_win', 'doubters_win')),
  ADD COLUMN ruling_deadline TIMESTAMPTZ;

-- Allow ruling and ruling_deadline to be set on insert/update
-- (The existing RLS policies allow authenticated users to insert their own proofs
--  and the proofs.Update type already covers caption; we extend it here.)
COMMENT ON COLUMN proofs.ruling IS
  'Claimant verdict: riders_win (YES) or doubters_win (NO). NULL for evidence-only proofs.';
COMMENT ON COLUMN proofs.ruling_deadline IS
  'Timestamp when the 24-hour community vote window closes. Set to NOW() + INTERVAL ''24 hours'' when ruling is submitted.';
