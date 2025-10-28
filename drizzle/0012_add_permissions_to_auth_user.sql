-- Add a JSON text column `permissions` to auth_user for storing user permissions array
BEGIN;
PRAGMA foreign_keys=OFF;

-- Only add the column if it does not already exist. SQLite doesn't support IF NOT EXISTS for ADD COLUMN,
-- so we attempt to read the schema first in client scripts; for migrations we add the column and rely on drizzle-kit
-- to skip if it was applied previously.
ALTER TABLE "auth_user" ADD COLUMN "permissions" text NOT NULL DEFAULT '[]';

PRAGMA foreign_keys=ON;
COMMIT;
