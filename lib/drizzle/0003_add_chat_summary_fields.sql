-- Add new columns to Chat table for summarization and chat management
ALTER TABLE "Chat" 
  ADD COLUMN IF NOT EXISTS "title" varchar(255),
  ADD COLUMN IF NOT EXISTS "summary" varchar(2000),
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL;

