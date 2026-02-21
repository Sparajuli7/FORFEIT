-- ============================================================================
-- Chat Feature: conversations, conversation_participants, messages
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. conversations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('group', 'competition', 'dm')),
  group_id   uuid REFERENCES groups(id) ON DELETE CASCADE,
  bet_id     uuid REFERENCES bets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at   timestamptz,
  last_message_preview text
);

-- One chat per group, one chat per competition
CREATE UNIQUE INDEX IF NOT EXISTS conversations_group_id_unique ON conversations (group_id) WHERE group_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_bet_id_unique   ON conversations (bet_id)   WHERE bet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx    ON conversations (last_message_at DESC);

-- --------------------------------------------------------------------------
-- 2. conversation_participants
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_participants_conv_user ON conversation_participants (conversation_id, user_id);
CREATE INDEX IF NOT EXISTS conversation_participants_user_idx ON conversation_participants (user_id);

-- --------------------------------------------------------------------------
-- 3. messages
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         text NOT NULL DEFAULT '',
  type            text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  media_url       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages (conversation_id, created_at DESC);

-- --------------------------------------------------------------------------
-- 4. Trigger: auto-update conversation.last_message_at & last_message_preview
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON messages;
CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- --------------------------------------------------------------------------
-- 5. RLS Policies
-- --------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- conversations policies
DROP POLICY IF EXISTS "Users can read conversations they participate in" ON conversations;
CREATE POLICY "Users can read conversations they participate in"
  ON conversations FOR SELECT
  USING (is_conversation_participant(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow trigger updates on conversations" ON conversations;
CREATE POLICY "Allow trigger updates on conversations"
  ON conversations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- conversation_participants policies
DROP POLICY IF EXISTS "Users can read participants in their conversations" ON conversation_participants;
CREATE POLICY "Users can read participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own participant row" ON conversation_participants;
CREATE POLICY "Users can update their own participant row"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_participants;
CREATE POLICY "Users can leave conversations"
  ON conversation_participants FOR DELETE
  USING (user_id = auth.uid());

-- messages policies
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON messages;
CREATE POLICY "Users can read messages in their conversations"
  ON messages FOR SELECT
  USING (is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_participant(conversation_id, auth.uid())
  );

-- --------------------------------------------------------------------------
-- 6. Enable Realtime (ignore errors if already added)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
