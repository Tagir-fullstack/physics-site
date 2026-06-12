-- ============================================================
-- MVP кабинета учителя: классы и привязка результатов
-- Применить один раз в SQL-редакторе Supabase.
-- ============================================================

-- 1. Таблица классов
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  school VARCHAR(255),
  grade VARCHAR(50),
  join_code VARCHAR(12) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);

-- 2. Привязка результатов к классу (необязательная)
ALTER TABLE pre_quiz_results
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE post_quiz_results
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pre_quiz_class_id ON pre_quiz_results(class_id);
CREATE INDEX IF NOT EXISTS idx_post_quiz_class_id ON post_quiz_results(class_id);

-- 3. RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Учитель видит/правит только свои классы
DROP POLICY IF EXISTS "classes_owner_select" ON classes;
CREATE POLICY "classes_owner_select" ON classes
  FOR SELECT USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "classes_owner_insert" ON classes;
CREATE POLICY "classes_owner_insert" ON classes
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "classes_owner_update" ON classes;
CREATE POLICY "classes_owner_update" ON classes
  FOR UPDATE USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "classes_owner_delete" ON classes;
CREATE POLICY "classes_owner_delete" ON classes
  FOR DELETE USING (auth.uid() = teacher_id);

-- 4. RPC для проверки кода (без раскрытия чужих классов)
CREATE OR REPLACE FUNCTION find_class_by_code(p_code TEXT)
RETURNS TABLE(id UUID, name TEXT, school TEXT, grade TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name::TEXT, school::TEXT, grade::TEXT
  FROM classes
  WHERE join_code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_class_by_code(TEXT) TO anon, authenticated;

-- 5. Учитель может читать результаты учеников своего класса
DROP POLICY IF EXISTS "pre_quiz_teacher_class_select" ON pre_quiz_results;
CREATE POLICY "pre_quiz_teacher_class_select" ON pre_quiz_results
  FOR SELECT USING (
    class_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = pre_quiz_results.class_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "post_quiz_teacher_class_select" ON post_quiz_results;
CREATE POLICY "post_quiz_teacher_class_select" ON post_quiz_results
  FOR SELECT USING (
    class_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = post_quiz_results.class_id
        AND c.teacher_id = auth.uid()
    )
  );
