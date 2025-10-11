CREATE TABLE IF NOT EXISTS "auth_user" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "username" text NOT NULL,
    "username_normalized" text NOT NULL,
    "password_hash" text NOT NULL,
    "password_salt" text NOT NULL,
    "password_updated_at" text,
    "created_at" text NOT NULL,
    "updated_at" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_username_normalized_unique" ON "auth_user" ("username_normalized");

CREATE TABLE IF NOT EXISTS "auth_session" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" integer NOT NULL,
    "token_hash" text NOT NULL,
    "user_agent" text,
    "ip_address" text,
    "expires_at" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_user" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_session_token_hash_unique" ON "auth_session" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_session_user_id_idx" ON "auth_session" ("user_id");
