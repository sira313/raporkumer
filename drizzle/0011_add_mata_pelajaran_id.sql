-- Add mata_pelajaran_id to auth_user so RBAC 'user' can be locked to a subject
ALTER TABLE auth_user ADD COLUMN mata_pelajaran_id INTEGER;
-- Note: SQLite does not support adding foreign key constraints via ALTER TABLE; the Drizzle schema
-- already defines the relation. Existing rows will have NULL in this column.
