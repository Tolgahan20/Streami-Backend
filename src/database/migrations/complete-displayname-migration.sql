-- Complete migration: Replace displayName with firstName and lastName
-- This migration should be run on production database

-- Step 1: Add firstName and lastName columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Step 2: Migrate existing displayName data to firstName and lastName
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

-- Step 3: Drop displayName column
ALTER TABLE "user" DROP COLUMN IF EXISTS "displayName";
