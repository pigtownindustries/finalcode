-- Add PIN column to users table for authentication
-- This PIN is used for Owner Dashboard access

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(6);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);

-- Add comment to explain the column
COMMENT ON COLUMN users.pin IS 'Six-digit PIN for authentication and Owner Dashboard access';
