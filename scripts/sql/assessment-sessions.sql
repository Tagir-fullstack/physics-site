-- Additive only: no existing profiles, attempts, answers or scores are changed.
CREATE TABLE IF NOT EXISTS assessment_access_settings (
  period_key varchar(64) PRIMARY KEY REFERENCES assessment_periods(key),
  sessions_required boolean NOT NULL DEFAULT true,
  reveal_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key varchar(64) NOT NULL REFERENCES assessment_periods(key),
  test_id varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  code varchar(12) NOT NULL UNIQUE,
  opens_at timestamptz NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  ended_at timestamptz,
  created_by varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (opens_at <= starts_at AND starts_at < ends_at),
  CHECK (duration_minutes BETWEEN 1 AND 180)
);
CREATE INDEX IF NOT EXISTS assessment_sessions_period_idx ON assessment_sessions(period_key);
CREATE TABLE IF NOT EXISTS assessment_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  student jsonb NOT NULL,
  identity_hash varchar(64) NOT NULL,
  clerk_user_id varchar(64),
  token_hash varchar(64) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('admitted','pending','rejected')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by varchar(64),
  extra_seconds integer NOT NULL DEFAULT 0 CHECK (extra_seconds BETWEEN 0 AND 10800),
  extension_reason varchar(300),
  UNIQUE(session_id, identity_hash)
);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_participants_account_idx ON assessment_participants(session_id, clerk_user_id) WHERE clerk_user_id IS NOT NULL;
