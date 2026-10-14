-- Additive only: no changes to existing assessment attempts or scores.
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name varchar(60) NOT NULL,
  first_name varchar(60) NOT NULL,
  student_group varchar(60) NOT NULL,
  identity_key varchar(64) NOT NULL UNIQUE,
  recovery_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oberbeck_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES student_profiles(id),
  code varchar(16) NOT NULL UNIQUE,
  fingerprint varchar(160) NOT NULL UNIQUE,
  parameters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
