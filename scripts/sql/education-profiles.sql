CREATE TABLE IF NOT EXISTS education_profiles (
 user_id varchar(128) PRIMARY KEY,
 role varchar(16) NOT NULL CHECK(role IN ('student','teacher')),
 university_id varchar(80) NOT NULL,
 institution varchar(255) NOT NULL,
 display_name varchar(200) NOT NULL,
 first_name varchar(60) NOT NULL,
 last_name varchar(60) NOT NULL,
 group_name varchar(60),
 default_class_id uuid REFERENCES teacher_classes(id) ON DELETE SET NULL,
 teacher_user_id varchar(128),
 class_student_id uuid REFERENCES class_students(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS education_directory_idx ON education_profiles(university_id, role);
