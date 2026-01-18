-- Drop existing function to update signature
DROP FUNCTION IF EXISTS match_memory;

-- Re-create function with created_at and category in return table
CREATE OR REPLACE FUNCTION match_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  fact_text TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_memory.id,
    user_memory.fact_text,
    user_memory.category,
    user_memory.created_at,
    1 - (user_memory.embedding <=> query_embedding) as similarity
  FROM user_memory
  WHERE user_memory.user_id = p_user_id
  AND 1 - (user_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY user_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
