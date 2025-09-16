-- Migration: Add Google Authentication Support
-- This migration adds support for Google OAuth login alongside existing email/password auth

-- Make passwordHash nullable (for Google users who don't have passwords)
ALTER TABLE "user" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Add loginType column with default value
ALTER TABLE "user" ADD COLUMN "loginType" TEXT NOT NULL DEFAULT 'EMAIL';

-- Add googleId column for storing Google UID
ALTER TABLE "user" ADD COLUMN "googleId" TEXT;

-- Create unique index on googleId to ensure no duplicate Google accounts
CREATE UNIQUE INDEX "IDX_user_googleId" ON "user" ("googleId") WHERE "googleId" IS NOT NULL;

-- Update existing users to have EMAIL login type
UPDATE "user" SET "loginType" = 'EMAIL' WHERE "loginType" IS NULL;

-- Add constraint to ensure loginType is either EMAIL or GOOGLE
ALTER TABLE "user" ADD CONSTRAINT "CHK_user_loginType" CHECK ("loginType" IN ('EMAIL', 'GOOGLE'));

-- Add constraint to ensure Google users don't have passwords
ALTER TABLE "user" ADD CONSTRAINT "CHK_google_user_no_password" 
  CHECK (("loginType" = 'GOOGLE' AND "passwordHash" IS NULL) OR "loginType" = 'EMAIL');

-- Add constraint to ensure Google users have googleId
ALTER TABLE "user" ADD CONSTRAINT "CHK_google_user_has_googleId" 
  CHECK (("loginType" = 'GOOGLE' AND "googleId" IS NOT NULL) OR "loginType" = 'EMAIL');
