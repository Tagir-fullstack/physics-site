ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS teacher_status varchar(16) NOT NULL DEFAULT 'pending';
ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS department varchar(160);
ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS verification_note varchar(500);
ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS reviewed_by varchar(128);
ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE INDEX IF NOT EXISTS education_teacher_status_idx ON education_profiles(teacher_status) WHERE role = 'teacher';
