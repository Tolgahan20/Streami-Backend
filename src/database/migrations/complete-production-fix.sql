-- Complete Production Database Fix
-- This migration fixes all production database issues:
-- 1. Renames 'user' table to 'users' 
-- 2. Adds missing 'profiles' and 'social_links' tables
-- 3. Adds missing 'firstName' and 'lastName' columns
-- 4. Removes old 'displayName' column

-- Step 1: Rename 'user' table to 'users' (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
        ALTER TABLE "user" RENAME TO "users";
        RAISE NOTICE 'Renamed user table to users';
    ELSE
        RAISE NOTICE 'User table does not exist or already renamed';
    END IF;
END $$;

-- Step 2: Add firstName and lastName columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Step 3: Migrate data from displayName to firstName/lastName (if displayName exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'displayName') THEN
        -- Split displayName into firstName and lastName
        UPDATE "users" 
        SET 
            "firstName" = CASE 
                WHEN "displayName" IS NULL OR "displayName" = '' THEN NULL
                WHEN position(' ' in "displayName") = 0 THEN "displayName"
                ELSE split_part("displayName", ' ', 1)
            END,
            "lastName" = CASE 
                WHEN "displayName" IS NULL OR "displayName" = '' THEN NULL
                WHEN position(' ' in "displayName") = 0 THEN NULL
                ELSE substring("displayName" from position(' ' in "displayName") + 1)
            END
        WHERE "firstName" IS NULL OR "lastName" IS NULL;
        
        RAISE NOTICE 'Migrated displayName data to firstName/lastName';
    ELSE
        RAISE NOTICE 'displayName column does not exist';
    END IF;
END $$;

-- Step 4: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL,
    "bio" text,
    "location" character varying(100),
    "website" character varying(255),
    "avatarUrl" character varying(500),
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "PK_profiles" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_profiles_userId" UNIQUE ("userId")
);

-- Step 5: Create social_links table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "social_links" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "platform" character varying(20) NOT NULL,
    "url" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "PK_social_links" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_social_links_profile_platform" UNIQUE ("profileId", "platform")
);

-- Step 6: Add foreign key constraints (if they don't exist)
DO $$ 
BEGIN
    -- Add foreign key from profiles to users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_315ecd98bd1a42dcf2ec4e2e985'
    ) THEN
        ALTER TABLE "profiles" ADD CONSTRAINT "FK_315ecd98bd1a42dcf2ec4e2e985" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for profiles.userId';
    END IF;
    
    -- Add foreign key from social_links to profiles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_social_links_profile'
    ) THEN
        ALTER TABLE "social_links" ADD CONSTRAINT "FK_social_links_profile" 
        FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for social_links.profileId';
    END IF;
END $$;

-- Step 7: Remove displayName column (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'displayName') THEN
        ALTER TABLE "users" DROP COLUMN "displayName";
        RAISE NOTICE 'Removed displayName column';
    ELSE
        RAISE NOTICE 'displayName column does not exist';
    END IF;
END $$;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "IDX_profiles_userId" ON "profiles" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_social_links_profileId" ON "social_links" ("profileId");
CREATE INDEX IF NOT EXISTS "IDX_social_links_platform" ON "social_links" ("platform");

-- Verification queries (optional - remove if not needed)
-- SELECT 'Migration completed successfully' as status;
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('users', 'profiles', 'social_links');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('firstName', 'lastName');
