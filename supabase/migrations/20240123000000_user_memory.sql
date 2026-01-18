-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table to store user memories
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  fact_text TEXT NOT NULL,
  embedding vector(768), -- Gemini text-embedding-004 uses 768 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own memories
CREATE POLICY "Users can manage their own memories"
  ON user_memory
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster similarity search
-- Note: IVFFlat is good for large datasets, HNSW is better for recall but more expensive to build.
-- For a personal memory store, IVFFlat or even exact search (no index) is fine initially.
-- Let's create an IVFFlat index for future proofing.
-- IMPORTANT: IVFFlat requires some data to build effectively. We might skip creating the index 
-- in the initial migration if the table is empty, or just create it. 
-- For simplicity and compatibility, we'll create a basic index.
CREATE INDEX ON user_memory USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RPC function to match memories
-- This allows us to call this function from our Edge Function
CREATE OR REPLACE FUNCTION match_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  fact_text TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_memory.id,
    user_memory.fact_text,
    1 - (user_memory.embedding <=> query_embedding) as similarity
  FROM user_memory
  WHERE user_memory.user_id = p_user_id
  AND 1 - (user_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY user_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
