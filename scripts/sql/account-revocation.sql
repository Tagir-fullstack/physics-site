CREATE TABLE IF NOT EXISTS revoked_clerk_accounts (
  user_id varchar(128) PRIMARY KEY,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
