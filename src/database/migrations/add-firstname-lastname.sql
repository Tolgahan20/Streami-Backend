-- Migration: Add firstName and lastName columns to user table
-- This migration adds firstName and lastName columns and migrates existing displayName data

-- Add firstName and lastName columns
ALTER TABLE "user" ADD COLUMN "firstName" TEXT;
ALTER TABLE "user" ADD COLUMN "lastName" TEXT;

-- Migrate existing displayName data to firstName and lastName
-- Split displayName by space and assign first part to firstName, rest to lastName
UPDATE "user" 
SET 
  "firstName" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN NULL
    WHEN POSITION(' ' IN "displayName") = 0 THEN "displayName"
    ELSE SUBSTRING("displayName" FROM 1 FOR POSITION(' ' IN "displayName") - 1)
  END,
  "lastName" = CASE 
    WHEN "displayName" IS NULL OR "displayName" = '' THEN NULL
    WHEN POSITION(' ' IN "displayName") = 0 THEN NULL
    ELSE SUBSTRING("displayName" FROM POSITION(' ' IN "displayName") + 1)
  END
WHERE "displayName" IS NOT NULL;
