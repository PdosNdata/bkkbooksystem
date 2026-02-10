import React, { useState, useEffect } from 'react';
import { Wallet, FileText, Calendar, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Inline UI Components
const Card = ({ children, className = '' }) => (
  <div className={`rounded-lg border-2 border-gray-200 bg-white shadow-lg ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }) => (
  <div className={`flex flex-col space-y-1.5 p-6 border-b border-gray-100 bg-gray-50 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-2xl font-bold leading-none tracking-tight text-gray-800 ${className}`}>
    {children}
  </h3>
);

const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 ${className}`}>
    {children}
  </p>
);

const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, disabled, variant = 'default', size = 'default', className = '' }) => {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    outline: 'border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700',
    ghost: 'hover:bg-gray-100 hover:text-gray-900 text-gray-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:bg-gray-300 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, onBlur, disabled, type = 'text', min, max, className = '', ...props }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    disabled={disabled}
    min={min}
    max={max}
    className={`flex h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 ${className}`}
    {...props}
  />
);

const Label = ({ children, htmlFor, className = '' }) => (
  <label
    htmlFor={htmlFor}
    className={`text-sm font-semibold leading-none text-gray-700 mb-1.5 block ${className}`}
  >
    {children}
  </label>
);

const Alert = ({ children, className = '' }) => (
  <div className={`relative w-full rounded-lg border-2 p-4 shadow-md ${className}`}>
    {children}
  </div>
);

const AlertDescription = ({ children, className = '' }) => (
  <div className={`text-sm font-medium ${className}`}>
    {children}
  </div>
);

const Tabs = ({ children, defaultValue, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={className} data-active-tab={activeTab}>
      {React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
};

const TabsList = ({ children, activeTab, setActiveTab, className = '' }) => (
  <div className={`inline-flex h-12 items-center justify-center rounded-lg bg-gray-100 p-1.5 shadow-inner ${className}`}>
    {React.Children.map(children, child =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
);

const TabsTrigger = ({ children, value, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(value)}
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      activeTab === value
        ? 'bg-white text-blue-700 shadow-md'
        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const TabsContent = ({ children, value, activeTab, className = '' }) => {
  if (value !== activeTab) return null;
  
  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};

const Switch = ({ checked, onCheckedChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onCheckedChange(!checked)}
    disabled={disabled}
    className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? 'bg-blue-600 border-blue-600' : 'bg-gray-300 border-gray-300'
    }`}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const SettingDoc = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Document Types State
  const [documentTypes, setDocumentTypes] = useState([]);
  
  // Document Sequences State (for current year)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + 543);
  const [sequences, setSequences] = useState([]);
  
  // Fiscal Year Settings
  const [fiscalYearStart, setFiscalYearStart] = useState('01'); // เดือนเริ่มต้นปีงบประมาณ
  const [fiscalYearEnd, setFiscalYearEnd] = useState('12');
  const [fiscalYearStartYear, setFiscalYearStartYear] = useState(currentYear);
  const [fiscalYearEndYear, setFiscalYearEndYear] = useState(currentYear);
  const [currentFiscalYear, setCurrentFiscalYear] = useState(currentYear);
  const [budgetAmount, setBudgetAmount] = useState('0');

  // Load initial data
  useEffect(() => {
    loadDocumentTypes();
    loadSequences();
    loadFiscalYearSettings();
  }, [currentYear]);

  const loadDocumentTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('code');

      if (error) throw error;
      setDocumentTypes(data || []);
    } catch (error) {
      console.error('Error loading document types:', error);
      showMessage('error', 'ไม่สามารถโหลดข้อมูลประเภทเอกสารได้');
    } finally {
      setLoading(false);
    }
  };

  const loadSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('document_sequences')
        .select(`
          *,
          document_types (
            code,
            name_th,
            prefix
          )
        `)
        .eq('year', currentYear)
        .order('document_type_code');

      if (error) throw error;
      setSequences(data || []);
    } catch (error) {
      console.error('Error loading sequences:', error);
    }
  };

  const loadFiscalYearSettings = async () => {
    // โหลดการตั้งค่าปีงบประมาณจากฐานข้อมูล (ถ้ามี)
    // สามารถสร้างตารางแยกสำหรับเก็บการตั้งค่าระบบได้
    try {
      // ตัวอย่าง: โหลดจาก system_settings table
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'fiscal_year')
        .single();

      if (data) {
        const settings = JSON.parse(data.value || '{}');
        setFiscalYearStart(settings.start_month || '01');
        setFiscalYearEnd(settings.end_month || '12');
        setFiscalYearStartYear(settings.start_year || currentYear);
        setFiscalYearEndYear(settings.end_year || currentYear);
        setCurrentFiscalYear(settings.current_year || currentYear);
        setBudgetAmount(settings.budget_amount || '0');
      }
    } catch (error) {
      console.log('Using default fiscal year settings');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleUpdateDocumentType = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('document_types')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      showMessage('success', 'อัพเดทข้อมูลสำเร็จ');
      loadDocumentTypes();
    } catch (error) {
      console.error('Error updating document type:', error);
      showMessage('error', 'ไม่สามารถอัพเดทข้อมูลได้');
    }
  };

  const handleUpdateSequence = async (docTypeCode, newNumber) => {
    try {
      setSaving(true);
      
      // Check if sequence exists
      const existing = sequences.find(s => s.document_type_code === docTypeCode);
      
      if (existing) {
        const { error } = await supabase
          .from('document_sequences')
          .update({ last_number: parseInt(newNumber) })
          .eq('document_type_code', docTypeCode)
          .eq('year', currentYear);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_sequences')
          .insert({
            document_type_code: docTypeCode,
            year: currentYear,
            last_number: parseInt(newNumber)
          });

        if (error) throw error;
      }

      showMessage('success', 'อัพเดทเลขที่เอกสารสำเร็จ');
      loadSequences();
    } catch (error) {
      console.error('Error updating sequence:', error);
      showMessage('error', 'ไม่สามารถอัพเดทเลขที่เอกสารได้');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSequence = async (docTypeCode) => {
    if (!confirm('คุณต้องการรีเซ็ตเลขที่เอกสารเป็น 0 ใช่หรือไม่?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('document_sequences')
        .update({ last_number: 0 })
        .eq('document_type_code', docTypeCode)
        .eq('year', currentYear);

      if (error) throw error;

      showMessage('success', 'รีเซ็ตเลขที่เอกสารสำเร็จ');
      loadSequences();
    } catch (error) {
      console.error('Error resetting sequence:', error);
      showMessage('error', 'ไม่สามารถรีเซ็ตเลขที่เอกสารได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFiscalYear = async () => {
    try {
      setSaving(true);
      
      const settings = {
        start_month: fiscalYearStart,
        end_month: fiscalYearEnd,
        start_year: fiscalYearStartYear,
        end_year: fiscalYearEndYear,
        current_year: currentFiscalYear,
        budget_amount: budgetAmount
      };

      // บันทึกลง system_settings table
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'fiscal_year',
          value: JSON.stringify(settings),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      showMessage('success', 'บันทึกการตั้งค่าปีงบประมาณสำเร็จ');
    } catch (error) {
      console.error('Error saving fiscal year:', error);
      showMessage('error', 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(false);
    }
  };

  const getSequenceNumber = (docTypeCode) => {
    const seq = sequences.find(s => s.document_type_code === docTypeCode);
    return seq?.last_number || 0;
  };

  const generatePreview = (docType, number) => {
    return `${docType.prefix}${String(number).padStart(3, '0')}/${currentYear}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wallet className="h-8 w-8 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">การตั้งค่าเอกสารและปีงบประมาณ</h1>
        </div>
        <p className="text-gray-600 text-base">
          จัดการเลขที่เอกสาร ประเภทเอกสาร และตั้งค่าปีงบประมาณ
        </p>
      </div>

      {message.text && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            ประเภทเอกสาร
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <RefreshCw className="h-4 w-4 mr-2" />
            เลขที่เอกสาร
          </TabsTrigger>
          <TabsTrigger value="fiscal">
            <Calendar className="h-4 w-4 mr-2" />
            ปีงบประมาณ
          </TabsTrigger>
        </TabsList>

        {/* ประเภทเอกสาร */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>จัดการประเภทเอกสาร</CardTitle>
              <CardDescription>
                กำหนดประเภทเอกสารและ prefix สำหรับสร้างเลขที่เอกสาร
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-10 w-10 animate-spin mx-auto text-blue-600" />
                  <p className="mt-3 text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentTypes.map((docType) => (
                    <Card key={docType.id}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>รหัสเอกสาร</Label>
                            <Input
                              value={docType.code}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                          <div>
                            <Label>คำนำหน้าเลขที่</Label>
                            <Input
                              value={docType.prefix}
                              onChange={(e) => {
                                const updated = [...documentTypes];
                                const index = updated.findIndex(d => d.id === docType.id);
                                updated[index].prefix = e.target.value;
                                setDocumentTypes(updated);
                              }}
                              onBlur={() => handleUpdateDocumentType(docType.id, { prefix: docType.prefix })}
                            />
                          </div>
                          <div>
                            <Label>ชื่อภาษาไทย</Label>
                            <Input
                              value={docType.name_th}
                              onChange={(e) => {
                                const updated = [...documentTypes];
                                const index = updated.findIndex(d => d.id === docType.id);
                                updated[index].name_th = e.target.value;
                                setDocumentTypes(updated);
                              }}
                              onBlur={() => handleUpdateDocumentType(docType.id, { name_th: docType.name_th })}
                            />
                          </div>
                          <div>
                            <Label>ชื่อภาษาอังกฤษ</Label>
                            <Input
                              value={docType.name_en}
                              onChange={(e) => {
                                const updated = [...documentTypes];
                                const index = updated.findIndex(d => d.id === docType.id);
                                updated[index].name_en = e.target.value;
                                setDocumentTypes(updated);
                              }}
                              onBlur={() => handleUpdateDocumentType(docType.id, { name_en: docType.name_en })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>คำอธิบาย</Label>
                            <Input
                              value={docType.description || ''}
                              onChange={(e) => {
                                const updated = [...documentTypes];
                                const index = updated.findIndex(d => d.id === docType.id);
                                updated[index].description = e.target.value;
                                setDocumentTypes(updated);
                              }}
                              onBlur={() => handleUpdateDocumentType(docType.id, { description: docType.description })}
                            />
                          </div>
                          <div className="flex items-center justify-between md:col-span-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={docType.is_active}
                                onCheckedChange={(checked) => {
                                  handleUpdateDocumentType(docType.id, { is_active: checked });
                                }}
                              />
                              <Label>เปิดใช้งาน</Label>
                            </div>
                            <div className="text-sm text-gray-600">
                              ตัวอย่าง: <span className="font-mono font-bold text-blue-700 text-base">{generatePreview(docType, 1)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* เลขที่เอกสาร */}
        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>จัดการเลขที่เอกสาร</CardTitle>
              <CardDescription>
                กำหนดเลขเริ่มต้นและรีเซ็ตเลขที่เอกสารสำหรับปี พ.ศ. {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>ปี พ.ศ.</Label>
                <Input
                  type="number"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="w-40"
                />
              </div>

              <div className="space-y-4">
                {documentTypes.filter(dt => dt.is_active).map((docType) => {
                  const currentNumber = getSequenceNumber(docType.code);
                  const nextNumber = currentNumber + 1;
                  
                  return (
                    <Card key={docType.code}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{docType.name_th}</h3>
                              <p className="text-sm text-muted-foreground">{docType.name_en}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 font-medium">เลขที่ถัดไป</p>
                              <p className="font-mono text-3xl font-bold text-blue-700 mt-1">
                                {generatePreview(docType, nextNumber)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>เลขที่ปัจจุบัน</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={currentNumber}
                                  onChange={(e) => {
                                    const updated = sequences.map(s => 
                                      s.document_type_code === docType.code 
                                        ? { ...s, last_number: parseInt(e.target.value) || 0 }
                                        : s
                                    );
                                    setSequences(updated);
                                  }}
                                  min="0"
                                />
                                <Button
                                  onClick={() => handleUpdateSequence(docType.code, currentNumber)}
                                  disabled={saving}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-end">
                              <Button
                                variant="outline"
                                onClick={() => handleResetSequence(docType.code)}
                                disabled={saving}
                                className="w-full"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                รีเซ็ตเป็น 0
                              </Button>
                            </div>
                          </div>

                          <div className="text-xs bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                            <strong className="text-blue-900">💡 หมายเหตุ:</strong> 
                            <span className="text-blue-800"> เลขที่เอกสารจะถูกสร้างอัตโนมัติเมื่อสร้างเอกสารใหม่ 
                            โดยจะเพิ่มขึ้นทีละ 1 จากเลขที่ปัจจุบัน</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ปีงบประมาณ */}
        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ตั้งค่าปีงบประมาณ</CardTitle>
              <CardDescription>
                กำหนดช่วงเวลาของปีงบประมาณ งบประมาณ และปีงบประมาณปัจจุบัน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* งบประมาณ */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
                <h4 className="font-bold text-green-900 mb-4 text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  งบประมาณรวม
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>จำนวนเงินงบประมาณ (บาท)</Label>
                    <Input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      min="0"
                      step="1000"
                      placeholder="0.00"
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="bg-white border-2 border-green-300 rounded-lg p-4 w-full">
                      <p className="text-sm text-gray-600 mb-1">งบประมาณทั้งหมด</p>
                      <p className="text-2xl font-bold text-green-700">
                        ฿{parseFloat(budgetAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ช่วงเวลาปีงบประมาณ */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                <h4 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  ช่วงเวลาปีงบประมาณ
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* วันที่เริ่มต้น */}
                  <div className="space-y-3">
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-700 mb-3">📅 วันที่เริ่มต้น</p>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>เดือน</Label>
                          <select
                            value={fiscalYearStart}
                            onChange={(e) => setFiscalYearStart(e.target.value)}
                            className="w-full mt-1 rounded-md border-2 border-gray-300 bg-white px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((month, i) => (
                              <option key={i} value={String(i + 1).padStart(2, '0')}>
                                {month}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label>ปี พ.ศ.</Label>
                          <Input
                            type="number"
                            value={fiscalYearStartYear}
                            onChange={(e) => setFiscalYearStartYear(parseInt(e.target.value))}
                            min="2500"
                            max="2600"
                            className="font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* วันที่สิ้นสุด */}
                  <div className="space-y-3">
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-700 mb-3">📅 วันที่สิ้นสุด</p>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>เดือน</Label>
                          <select
                            value={fiscalYearEnd}
                            onChange={(e) => setFiscalYearEnd(e.target.value)}
                            className="w-full mt-1 rounded-md border-2 border-gray-300 bg-white px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((month, i) => (
                              <option key={i} value={String(i + 1).padStart(2, '0')}>
                                {month}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label>ปี พ.ศ.</Label>
                          <Input
                            type="number"
                            value={fiscalYearEndYear}
                            onChange={(e) => setFiscalYearEndYear(parseInt(e.target.value))}
                            min="2500"
                            max="2600"
                            className="font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ปีงบประมาณปัจจุบัน */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                <h4 className="font-bold text-purple-900 mb-4 text-lg">ปีงบประมาณปัจจุบัน</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>ปีงบประมาณที่ใช้งาน (พ.ศ.)</Label>
                    <Input
                      type="number"
                      value={currentFiscalYear}
                      onChange={(e) => setCurrentFiscalYear(parseInt(e.target.value))}
                      min="2500"
                      max="2600"
                      className="text-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* สรุปข้อมูล */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-6">
                <h4 className="font-bold text-amber-900 mb-3 text-lg">📊 สรุปข้อมูลปีงบประมาณ</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-amber-200">
                    <span className="font-semibold text-gray-700">ปีงบประมาณปัจจุบัน:</span>
                    <span className="font-bold text-amber-900 text-lg">พ.ศ. {currentFiscalYear}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-amber-200">
                    <span className="font-semibold text-gray-700">ช่วงเวลา:</span>
                    <span className="font-medium text-amber-900">
                      {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][parseInt(fiscalYearStart) - 1]} {fiscalYearStartYear}
                      {' - '}
                      {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][parseInt(fiscalYearEnd) - 1]} {fiscalYearEndYear}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-semibold text-gray-700">งบประมาณรวม:</span>
                    <span className="font-bold text-green-700 text-lg">
                      ฿{parseFloat(budgetAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={loadFiscalYearSettings}
                  disabled={saving}
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  รีเซ็ต
                </Button>
                <Button
                  onClick={handleSaveFiscalYear}
                  disabled={saving}
                  size="lg"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      บันทึกการตั้งค่า
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingDoc;