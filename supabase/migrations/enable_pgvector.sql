-- ============================================================================
-- MIGRATION: Enable pgvector and Create Spec Chunks for RAG Pipeline
-- ============================================================================
--
-- IMPORTANT: Run this migration manually in the Supabase SQL editor before deploying.
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Click on "SQL Editor" in the sidebar
-- 3. Create a new query and paste the entire contents of this file
-- 4. Run the query
--
-- This migration enables the pgvector extension and creates the infrastructure
-- for Retrieval-Augmented Generation (RAG) in API-Whispr. It allows specs to be
-- chunked and embedded, enabling semantic search over spec content.
--
-- ============================================================================

-- Enable the pgvector extension (required for vector embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the spec_chunks table for storing chunked spec content and embeddings
CREATE TABLE IF NOT EXISTS public.spec_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES public.api_specs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('endpoint', 'tag', 'schema', 'info')),
  chunk_content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security on spec_chunks table
ALTER TABLE public.spec_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see chunks for their own specs
CREATE POLICY "Users can view their own spec chunks" ON public.spec_chunks
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert chunks for their own specs
CREATE POLICY "Users can insert their own spec chunks" ON public.spec_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can delete chunks from their own specs
CREATE POLICY "Users can delete their own spec chunks" ON public.spec_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Create HNSW index on embedding column for fast cosine similarity search
-- HNSW (Hierarchical Navigable Small World) is optimized for high-dimensional vectors
CREATE INDEX IF NOT EXISTS spec_chunks_embedding_idx ON public.spec_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Create index on spec_id for faster lookups when matching chunks for a spec
CREATE INDEX IF NOT EXISTS spec_chunks_spec_id_idx ON public.spec_chunks(spec_id);

-- Create index on user_id for RLS and data management
CREATE INDEX IF NOT EXISTS spec_chunks_user_id_idx ON public.spec_chunks(user_id);

-- Create RPC function to match chunks based on embedding similarity
-- This function performs semantic search over spec chunks
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(1536),
  match_spec_id uuid,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  spec_id uuid,
  user_id uuid,
  chunk_index int,
  chunk_type text,
  chunk_content text,
  metadata jsonb,
  similarity float4
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    spec_chunks.id,
    spec_chunks.spec_id,
    spec_chunks.user_id,
    spec_chunks.chunk_index,
    spec_chunks.chunk_type,
    spec_chunks.chunk_content,
    spec_chunks.metadata,
    (1 - (spec_chunks.embedding <=> query_embedding)) as similarity
  FROM public.spec_chunks
  WHERE spec_chunks.spec_id = match_spec_id
    AND spec_chunks.embedding IS NOT NULL
  ORDER BY spec_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission on the match_chunks function to authenticated users
GRANT EXECUTE ON FUNCTION public.match_chunks TO authenticated;

-- ============================================================================
-- Migration complete. The app can now:
-- 1. Store chunked spec content in spec_chunks table
-- 2. Generate and store vector embeddings for each chunk
-- 3. Query chunks using semantic similarity via match_chunks RPC
-- ============================================================================
