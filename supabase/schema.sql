-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- API specifications table
CREATE TABLE api_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  parsed_spec JSONB, -- For OpenAPI JSON/YAML files
  raw_text TEXT,     -- For PDF extracted text
  filetype TEXT CHECK (filetype IN ('json', 'yaml', 'pdf', 'docx', 'text')),
  uploaded_at TIMESTAMP DEFAULT now()
);

-- Chat history table
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  spec_id UUID REFERENCES api_specs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own specs" ON api_specs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat history" ON chat_history
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX idx_api_specs_user_id ON api_specs(user_id);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_spec_id ON chat_history(spec_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS (Row Level Security)
alter table if exists public.api_specs enable row level security;
alter table if exists public.chat_history enable row level security;

-- Create api_specs table
create table if not exists public.api_specs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  filetype text not null check (filetype in ('yaml', 'json', 'pdf', 'docx', 'text')),
  raw_text text,
  parsed_spec jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create chat_history table
create table if not exists public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  spec_id uuid references public.api_specs(id) on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for api_specs
create policy "Users can view their own specs" on public.api_specs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own specs" on public.api_specs
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own specs" on public.api_specs
  for update using (auth.uid() = user_id);

create policy "Users can delete their own specs" on public.api_specs
  for delete using (auth.uid() = user_id);

-- RLS Policies for chat_history
create policy "Users can view their own chat history" on public.chat_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own chat history" on public.chat_history
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own chat history" on public.chat_history
  for update using (auth.uid() = user_id);

create policy "Users can delete their own chat history" on public.chat_history
  for delete using (auth.uid() = user_id);

-- Update the check constraint to include docx
alter table if exists public.api_specs drop constraint if exists api_specs_filetype_check;
alter table if exists public.api_specs add constraint api_specs_filetype_check check (filetype in ('yaml', 'json', 'pdf', 'docx', 'text')); 