-- =====================================================
-- Student Book Distributions Migration
-- ตารางบันทึกการแจกหนังสือให้นักเรียนรายคน
-- =====================================================

-- สร้างตาราง student_book_distributions
CREATE TABLE IF NOT EXISTS student_book_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  book_stock_id UUID NOT NULL REFERENCES book_stock(id) ON DELETE RESTRICT,
  academic_year TEXT NOT NULL,                        -- ปีการศึกษา เช่น '2568'
  grade TEXT NOT NULL,                                -- ชั้นเรียน เช่น 'p1', 'm1'
  distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  semester TEXT DEFAULT '1',                          -- ภาคเรียน: '1' หรือ '2'
  distributed_by UUID REFERENCES users(id),           -- ผู้ที่ทำการแจก
  notes TEXT,                                         -- หมายเหตุ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- แต่ละนักเรียนได้หนังสือแต่ละเล่มเพียง 1 เล่มต่อปีการศึกษา
  UNIQUE(student_id, book_id, academic_year)
);

-- สร้าง indexes เพื่อเพิ่มประสิทธิภาพการค้นหา
CREATE INDEX IF NOT EXISTS idx_student_distributions_student
  ON student_book_distributions(student_id);

CREATE INDEX IF NOT EXISTS idx_student_distributions_book
  ON student_book_distributions(book_id);

CREATE INDEX IF NOT EXISTS idx_student_distributions_grade_year
  ON student_book_distributions(grade, academic_year);

CREATE INDEX IF NOT EXISTS idx_student_distributions_date
  ON student_book_distributions(distribution_date);

-- Enable Row Level Security
ALTER TABLE student_book_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view student distributions"
  ON student_book_distributions FOR SELECT USING (true);

CREATE POLICY "Admin/Staff can manage student distributions"
  ON student_book_distributions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Trigger สำหรับ updated_at
CREATE TRIGGER trg_student_distributions_updated_at
  BEFORE UPDATE ON student_book_distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
