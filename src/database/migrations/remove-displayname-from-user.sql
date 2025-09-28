-- Migration: Remove displayName column from user table
-- This migration removes the displayName column since we now use firstName and lastName

-- Drop displayName column if it exists
ALTER TABLE "user" DROP COLUMN IF EXISTS "displayName";
