-- Additive migration: existing attempts, answers and scores are not modified.
CREATE TABLE IF NOT EXISTS assessment_periods (
  key varchar(64) PRIMARY KEY,
  test_id varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_periods_active_test_idx
  ON assessment_periods (test_id) WHERE active = true;
INSERT INTO assessment_periods (key, test_id, name, active)
VALUES ('mechanics-cut-v2', 'mechanics', '2026–2027', true)
ON CONFLICT (key) DO NOTHING;
