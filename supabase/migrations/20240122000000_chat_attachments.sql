-- Chat Attachments Table
CREATE TABLE chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      WHERE chat_messages.id = chat_attachments.message_id
      AND chat_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_messages
        WHERE chat_messages.id = chat_attachments.message_id
        AND chat_messages.user_id = auth.uid()
    )
    -- Also allow inserting if message_id is not yet linked (handled by frontend logic usually inserting message first or concurrently)
    -- Actually, for simplicity in frontend, we might upload file to storage FIRST, then insert row here.
    -- But this table links to message_id. So message must exist. 
    -- We can just rely on the fact that we insert message then attachment.
  );

-- Supabase Storage Policies (need to be run in SQL editor or via migration if supported)
-- Bucket: chat-attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated users can read chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
