-- Chat Sessions Table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX chat_sessions_user_id_created_at_idx ON chat_sessions(user_id, created_at DESC);

-- Add session_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Index for session-based queries
CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id, created_at ASC);

-- Backfill Strategy:
-- For existing messages without a session, we'll create a "Legacy" session on first access (handled in app code)
-- Alternatively, you can run this one-time migration:
-- INSERT INTO chat_sessions (user_id, title)
-- SELECT DISTINCT user_id, 'Legacy Chat' FROM chat_messages WHERE session_id IS NULL;
-- UPDATE chat_messages SET session_id = (SELECT id FROM chat_sessions WHERE chat_sessions.user_id = chat_messages.user_id LIMIT 1) WHERE session_id IS NULL;
