-- Add public/private visibility toggle for competitions
-- Defaults to true (public) so existing competitions remain visible
ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
