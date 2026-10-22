ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS variant_number serial;
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_variant_number_unique ON student_profiles (variant_number);
