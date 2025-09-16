-- Add username column to user table
ALTER TABLE "user" 
ADD COLUMN username VARCHAR(30) UNIQUE;

-- Create index on username for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_username ON "user" (username);

-- Add comment for documentation
COMMENT ON COLUMN "user".username IS 'Unique username for the user (3-30 characters, alphanumeric and underscores only)';
