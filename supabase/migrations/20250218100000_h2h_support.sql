-- H2H Challenge Support
-- 1. Allow H2H opponent to decline (update bet status to voided)
-- 2. Trigger to create notification when H2H challenge is created

-- Policy: H2H opponent can void bet when declining
CREATE POLICY "H2H opponent can void pending challenge"
  ON bets FOR UPDATE
  USING (h2h_opponent_id = auth.uid() AND status = 'pending' AND bet_type = 'h2h')
  WITH CHECK (status = 'voided');

-- Trigger: Create notification when H2H challenge is created
CREATE OR REPLACE FUNCTION notify_h2h_challenge()
RETURNS trigger AS $$
BEGIN
  IF NEW.bet_type = 'h2h' AND NEW.h2h_opponent_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.h2h_opponent_id,
      'h2h_challenge',
      'H2H Challenge',
      'You''ve been challenged! Tap to view.',
      jsonb_build_object('bet_id', NEW.id, 'challenger_id', NEW.claimant_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_h2h_challenge
  AFTER INSERT ON bets
  FOR EACH ROW
  EXECUTE FUNCTION notify_h2h_challenge();
