-- =====================================================
-- Migration: เพิ่ม grade column ในตาราง withdrawals
-- =====================================================
-- ใช้รันใน Supabase SQL Editor เพื่อแก้ไขปัญหา "ไม่พบข้อมูลชั้นเรียน"
-- เมื่อกดเพิ่มรายการในหน้าแก้ไขใบเบิก

-- เพิ่ม column grade ในตาราง withdrawals (ถ้ายังไม่มี)
ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS grade TEXT;

-- สร้าง index สำหรับการค้นหาตาม grade
CREATE INDEX IF NOT EXISTS idx_withdrawals_grade ON withdrawals(grade);

-- อัปเดต grade จาก orders table สำหรับ withdrawals ที่มีอยู่แล้ว
UPDATE withdrawals w
SET grade = o.grade::TEXT
FROM orders o
WHERE w.order_id = o.id
  AND w.grade IS NULL;

-- Comment: สำหรับ withdrawals ที่ไม่มี order_id, grade จะต้องถูกกำหนดด้วยตนเอง
