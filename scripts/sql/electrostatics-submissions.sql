CREATE TABLE IF NOT EXISTS electrostatics_submissions (
  id uuid PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  variant_number integer NOT NULL CHECK (variant_number BETWEEN 1 AND 1000000),
  parameters jsonb NOT NULL,
  notebook jsonb NOT NULL CHECK (octet_length(notebook::text) <= 250000),
  snapshot_hash varchar(64) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','revision')),
  review_comment text NOT NULL DEFAULT '' CHECK (length(review_comment) <= 5000),
  reviewed_by varchar(128),
  reviewed_at timestamptz,
  review_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS electrostatics_submissions_student_created_idx ON electrostatics_submissions(student_id, created_at DESC, id DESC);
