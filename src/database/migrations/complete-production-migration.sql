-- Complete Database Migration for Production
-- This migration creates all missing tables and columns

-- Step 1: Add firstName and lastName columns to user table
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

-- Step 3: Create profiles table
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "bio" text,
    "location" character varying(100),
    "website" character varying(255),
    "avatarUrl" character varying(500),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_8e520eb4da7dc01d0f1906930e" PRIMARY KEY ("id")
);

-- Step 4: Create social_links table
CREATE TABLE IF NOT EXISTS "social_links" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "profileId" uuid NOT NULL,
    "platform" character varying(50) NOT NULL,
    "url" character varying(255) NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_social_links_id" PRIMARY KEY ("id")
);

-- Step 5: Add foreign key constraints
ALTER TABLE "profiles" ADD CONSTRAINT "FK_315ecd98bd1a42dcf2ec4e2e985" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "social_links" ADD CONSTRAINT "FK_social_links_profile" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE;

-- Step 6: Add unique constraint for profiles
ALTER TABLE "profiles" ADD CONSTRAINT "UQ_profiles_userId" UNIQUE ("userId");

-- Step 7: Drop displayName column if it exists
ALTER TABLE "user" DROP COLUMN IF EXISTS "displayName";

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "IDX_profiles_userId" ON "profiles" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_social_links_profileId" ON "social_links" ("profileId");
