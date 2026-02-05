-- =====================================================
-- Migration: Book Receipts System
-- ระบบรับหนังสือจากสำนักพิมพ์
-- =====================================================
-- รันใน Supabase SQL Editor

-- =====================================================
-- 1. สร้างตาราง typeofbooks (กลุ่มสาระการเรียนรู้)
-- =====================================================
CREATE TABLE IF NOT EXISTS typeofbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- ชื่อกลุ่มสาระ
  description TEXT,                    -- รายละเอียด
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- เพิ่มข้อมูลกลุ่มสาระเริ่มต้น
INSERT INTO typeofbooks (name) VALUES
  ('ภาษาไทย'),
  ('คณิตศาสตร์'),
  ('วิทยาศาสตร์และเทคโนโลยี'),
  ('สังคมศึกษา ศาสนาและวัฒนธรรม'),
  ('ภาษาต่างประเทศ'),
  ('สุขศึกษาและพลศึกษา'),
  ('ศิลปะ'),
  ('การงานอาชีพ')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. เพิ่ม type_id ใน books table (ถ้ายังไม่มี)
-- =====================================================
ALTER TABLE books ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES typeofbooks(id);

-- =====================================================
-- 3. เพิ่ม received_quantity ใน order_items
-- =====================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0;

-- =====================================================
-- 4. สร้างตาราง book_receipts (ใบรับหนังสือ)
-- =====================================================
CREATE TABLE IF NOT EXISTS book_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,       -- เลขที่ใบรับ เช่น REC-20260205-0001
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- วันที่รับ
  delivery_number INTEGER NOT NULL DEFAULT 1, -- ครั้งที่รับ (1, 2, 3...)
  grade TEXT,                                -- ชั้นเรียน
  subject_group TEXT,                        -- กลุ่มสาระ
  notes TEXT,                                -- หมายเหตุ
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. สร้างตาราง book_receipt_items (รายการในใบรับ)
-- =====================================================
CREATE TABLE IF NOT EXISTS book_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES book_receipts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  received_qty INTEGER NOT NULL DEFAULT 0,   -- จำนวนที่รับ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. สร้าง Index
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_book_receipts_date ON book_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_book_receipts_grade ON book_receipts(grade);
CREATE INDEX IF NOT EXISTS idx_book_receipt_items_receipt ON book_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_book_receipt_items_book ON book_receipt_items(book_id);
CREATE INDEX IF NOT EXISTS idx_books_type ON books(type_id);

-- =====================================================
-- 7. RLS Policies
-- =====================================================
ALTER TABLE typeofbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_receipt_items ENABLE ROW LEVEL SECURITY;

-- typeofbooks: อ่านได้ทุกคน
CREATE POLICY "Anyone can view typeofbooks" ON typeofbooks FOR SELECT USING (true);
CREATE POLICY "Admin can manage typeofbooks" ON typeofbooks FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin'))
);

-- book_receipts: อ่านได้ทุกคน, แก้ไขได้เฉพาะ admin/staff/warehouse
CREATE POLICY "Anyone can view book_receipts" ON book_receipts FOR SELECT USING (true);
CREATE POLICY "Admin can manage book_receipts" ON book_receipts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin'))
);
CREATE POLICY "Staff can insert book_receipts" ON book_receipts FOR INSERT WITH CHECK (true);

-- book_receipt_items: อ่านได้ทุกคน
CREATE POLICY "Anyone can view book_receipt_items" ON book_receipt_items FOR SELECT USING (true);
CREATE POLICY "Admin can manage book_receipt_items" ON book_receipt_items FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin'))
);
CREATE POLICY "Staff can insert book_receipt_items" ON book_receipt_items FOR INSERT WITH CHECK (true);

-- อัปเดต order_items policy สำหรับ update received_quantity
DROP POLICY IF EXISTS "Staff can update order_items" ON order_items;
CREATE POLICY "Staff can update order_items" ON order_items FOR UPDATE USING (true);

-- =====================================================
-- 8. Trigger สำหรับ updated_at
-- =====================================================
CREATE TRIGGER IF NOT EXISTS trg_typeofbooks_updated_at
  BEFORE UPDATE ON typeofbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_book_receipts_updated_at
  BEFORE UPDATE ON book_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
