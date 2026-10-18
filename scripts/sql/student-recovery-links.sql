CREATE TABLE IF NOT EXISTS student_recovery_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL,
  issued_by varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS student_recovery_links_student_idx ON student_recovery_links(student_id);
