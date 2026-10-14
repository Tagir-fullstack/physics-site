-- Link profiles without changing any existing variant or identity data.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS clerk_id varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_clerk_id_key ON student_profiles (clerk_id);
