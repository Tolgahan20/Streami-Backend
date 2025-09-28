-- Migration: Add Profiles and Social Links Tables
-- This migration adds support for user profiles and social links

-- Create profiles table
CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "bio" TEXT,
  "location" VARCHAR(100),
  "website" VARCHAR(255),
  "avatarUrl" VARCHAR(500),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create social_links table
CREATE TABLE "social_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "profileId" UUID NOT NULL,
  "platform" VARCHAR(50) NOT NULL CHECK ("platform" IN ('youtube', 'twitch', 'twitter', 'instagram', 'tiktok', 'discord', 'github', 'website')),
  "url" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("profileId", "platform")
);

-- Add foreign key constraints
ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_userId" 
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "social_links" ADD CONSTRAINT "FK_social_links_profileId" 
  FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX "IDX_profiles_userId" ON "profiles"("userId");
CREATE INDEX "IDX_social_links_profileId" ON "social_links"("profileId");
CREATE INDEX "IDX_social_links_platform" ON "social_links"("platform");
