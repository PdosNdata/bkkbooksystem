-- =====================================================
-- Settings Migration - ตารางสำหรับการตั้งค่าเอกสารและปีงบประมาณ
-- =====================================================

-- =====================================================
-- 1. SYSTEM_SETTINGS TABLE (การตั้งค่าระบบ)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                    -- JSON string สำหรับเก็บค่าต่างๆ
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger สำหรับ auto-update updated_at
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 2. DOCUMENT_TYPES TABLE (ประเภทเอกสาร)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- รหัสเอกสาร เช่น 'PO', 'BK', 'WD'
  name_th TEXT NOT NULL,                  -- ชื่อภาษาไทย
  name_en TEXT,                           -- ชื่อภาษาอังกฤษ
  prefix TEXT NOT NULL DEFAULT '',        -- คำนำหน้าเลขที่ เช่น 'ใบสั่ง', 'บ'
  description TEXT,                       -- คำอธิบาย
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger สำหรับ auto-update updated_at
CREATE TRIGGER trg_document_types_updated_at
  BEFORE UPDATE ON document_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 3. DOCUMENT_SEQUENCES TABLE (เลขที่เอกสาร)
-- =====================================================

CREATE TABLE IF NOT EXISTS document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_code TEXT NOT NULL REFERENCES document_types(code) ON DELETE CASCADE,
  year INTEGER NOT NULL,                  -- ปี ค.ศ.
  last_number INTEGER NOT NULL DEFAULT 0, -- เลขที่สุดท้ายที่ใช้
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(document_type_code, year)
);

-- Trigger สำหรับ auto-update updated_at
CREATE TRIGGER trg_document_sequences_updated_at
  BEFORE UPDATE ON document_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

-- System Settings: อ่านได้ทุกคน, แก้ไขได้เฉพาะ admin
CREATE POLICY "Anyone can view system_settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage system_settings" ON system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Document Types: อ่านได้ทุกคน, แก้ไขได้เฉพาะ admin
CREATE POLICY "Anyone can view document_types" ON document_types FOR SELECT USING (true);
CREATE POLICY "Admin can manage document_types" ON document_types FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Document Sequences: อ่านได้ทุกคน, แก้ไขได้เฉพาะ admin
CREATE POLICY "Anyone can view document_sequences" ON document_sequences FOR SELECT USING (true);
CREATE POLICY "Admin can manage document_sequences" ON document_sequences FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- 5. ข้อมูลเริ่มต้น (Default Data)
-- =====================================================

-- ประเภทเอกสารเริ่มต้น
INSERT INTO document_types (code, name_th, name_en, prefix, description, is_active) VALUES
  ('BK', 'ใบรับหนังสือ', 'Book Receipt', 'บ', 'เอกสารรับหนังสือเข้าคลัง', true),
  ('WD', 'ใบเบิกพัสดุ', 'Withdrawal', 'ว', 'เอกสารเบิกพัสดุ/หนังสือ', true),
  ('PO', 'ใบสั่งซื้อ', 'Purchase Order', 'สซ', 'เอกสารสั่งซื้อหนังสือ', true)
ON CONFLICT (code) DO NOTHING;

-- การตั้งค่าปีงบประมาณเริ่มต้น
INSERT INTO system_settings (key, value, description) VALUES
  ('fiscal_year', '{"start_date": "2024-10-01", "end_date": "2025-09-30", "current_year": 2568, "total_budget": "0"}', 'การตั้งค่าปีงบประมาณ')
ON CONFLICT (key) DO NOTHING;
