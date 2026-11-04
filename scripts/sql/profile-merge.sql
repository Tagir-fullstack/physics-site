ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES student_profiles(id);
ALTER TABLE education_profiles ADD COLUMN IF NOT EXISTS merged_into_user_id varchar(128) REFERENCES education_profiles(user_id);
CREATE INDEX IF NOT EXISTS student_profiles_merged_into_idx ON student_profiles(merged_into) WHERE merged_into IS NOT NULL;
