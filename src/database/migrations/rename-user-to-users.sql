-- Migration: Rename 'user' table to 'users'
-- This migration renames the user table to users to follow proper naming conventions

-- Rename the table
ALTER TABLE "user" RENAME TO "users";

-- Update any foreign key constraints that reference the old table name
-- Note: PostgreSQL automatically updates foreign key constraints when tables are renamed
-- but we should verify that all references are working correctly

-- Verify the table was renamed successfully
-- This is just for verification - you can remove this line if needed
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'users';
