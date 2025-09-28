-- Migration: Remove displayName from profiles table
-- This migration removes the displayName column since it should come from the user table

-- Drop displayName column if it exists
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "displayName";
