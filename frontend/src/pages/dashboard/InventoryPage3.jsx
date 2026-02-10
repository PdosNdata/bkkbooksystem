import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Edit3, Trash2, AlertTriangle, Package, Loader2, Upload, Download, FileText } from 'lucide-react'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'

const PAGE_SIZE = 10
const subjectGroupOptions = [
  'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ภาษาต่างประเทศ',
]

export default function InventoryPage3() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', author: '', publisher: '', price: '', level: 'primary', grade: 'p1', subject: '' })
  const [csvUploading, setCsvUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchInventory() }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          book_stock (
            available_quantity,
            grade,
            academic_year
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching inventory:', error)
        Swal.fire({ 
          icon: 'error', 
          title: 'เกิดข้อผิดพลาด', 
          text: error.message
        })
      }
      
      console.log('Fetched books data:', data)
      setItems(data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      Swal.fire({ 
        icon: 'error', 
        title: 'เกิดข้อผิดพลาด', 
        text: err.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ title: '', author: '', publisher: '', price: '', level: 'primary', grade: 'p1', subject: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ 
      title: item.title, 
      author: item.author || '', 
      publisher: item.publisher || '', 
      price: item.price, 
      level: item.level, 
      grade: item.grade, 
      subject: item.subject || '' 
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.price) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบ', confirmButtonColor: '#2563eb' })
      return
    }
    const payload = { ...form, price: Number(form.price), is_active: true }

    try {
      if (editItem) {
        const { error } = await supabase.from('books').update(payload).eq('id', editItem.id)
        if (error) throw error
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', timer: 1200, showConfirmButton: false })
      } else {
        const { error } = await supabase.from('books').insert(payload)
        if (error) throw error
        Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ', timer: 1200, showConfirmButton: false })
      }
      setShowModal(false)
      fetchInventory()
    } catch (error) {
      console.error('Save error:', error)
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message })
    }
  }

  const handleDelete = async (id, title) => {
    const result = await Swal.fire({ 
      title: `ลบ "${title}"?`, 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'ลบ', 
      cancelButtonText: 'ยกเลิก', 
      confirmButtonColor: '#dc2626' 
    })
    if (!result.isConfirmed) return
    
    try {
      const { error } = await supabase.from('books').update({ is_active: false }).eq('id', id)
      if (error) throw error
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false })
      fetchInventory()
    } catch (error) {
      console.error('Delete error:', error)
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message })
    }
  }

  // --- CSV Upload ---
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvUploading(true)

    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      
      if (lines.length < 2) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'ไฟล์ CSV ไม่ถูกต้อง', 
          text: 'ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว', 
          confirmButtonColor: '#2563eb' 
        })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredCols = ['title', 'price', 'grade']
      const missing = requiredCols.filter(c => !headers.includes(c))
      
      if (missing.length > 0) {
        Swal.fire({ 
          icon: 'error', 
          title: 'คอลัมน์ไม่ครบ', 
          text: `ต้องมีคอลัมน์: ${requiredCols.join(', ')}`, 
          confirmButtonColor: '#2563eb' 
        })
        return
      }

      const rows = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })
        if (!row.title || !row.price || !row.grade) continue
        
        rows.push({
          title: row.title,
          author: row.author || null,
          publisher: row.publisher || null,
          price: Number(row.price) || 0,
          level: row.level || 'primary',
          grade: row.grade,
          subject: row.subject || null,
          is_active: true
        })
      }

      if (rows.length === 0) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'ไม่มีข้อมูล', 
          text: 'ไม่พบแถวข้อมูลที่ถูกต้อง', 
          confirmButtonColor: '#2563eb' 
        })
        return
      }

      const { error } = await supabase
        .from('books')
        .insert(rows)
      
      if (error) throw error
      
      Swal.fire({ 
        icon: 'success', 
        title: 'นำเข้าสำเร็จ', 
        text: `เพิ่มหนังสือ ${rows.length} รายการ`, 
        timer: 2000, 
        showConfirmButton: false 
      })
      fetchInventory()
    } catch (error) {
      console.error('CSV upload error:', error)
      Swal.fire({ icon: 'error', title: 'อัพโหลดผิดพลาด', text: error.message })
    } finally {
      setCsvUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Helper function to get stock info - รวมจากทุก grade และ academic_year
  const getStockInfo = (item) => {
    if (!item.book_stock || !Array.isArray(item.book_stock)) {
      return {
        available: 0,
        min: 5
      }
    }
    
    // รวม available_quantity จากทุก record
    const totalAvailable = item.book_stock.reduce((sum, stock) => {
      return sum + (stock.available_quantity || 0)
    }, 0)
    
    return {
      available: totalAvailable,
      min: 5 // ค่าเริ่มต้น
    }
  }

  // --- CSV Export ---
  const exportCsv = () => {
    const csvHeaders = ['title', 'author', 'publisher', 'price', 'level', 'grade', 'subject', 'stock']
    const csvRows = filtered.map(item => {
      const { available } = getStockInfo(item)
      return [
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${(item.author || '').replace(/"/g, '""')}"`,
        `"${(item.publisher || '').replace(/"/g, '""')}"`,
        item.price,
        item.level,
        item.grade,
        `"${(item.subject || '').replace(/"/g, '""')}"`,
        available
      ]
    })
    const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- PDF Export ---
  const exportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4')

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Inventory Report', 14, 15)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Date: ${new Date().toLocaleDateString('th-TH')}  |  Total: ${filtered.length} items`, 14, 22)

    const headers = ['#', 'Title', 'Grade', 'Subject', 'Publisher', 'Price', 'Stock']
    const colWidths = [10, 80, 25, 45, 55, 25, 20]
    const startX = 14
    let y = 30
    const rowH = 7

    // Header row
    doc.setFillColor(37, 99, 235)
    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('Helvetica', 'bold')
    let x = startX
    headers.forEach((h, i) => { doc.text(h, x + 2, y + 5); x += colWidths[i] })
    y += rowH

    // Data rows
    doc.setFont('Helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    filtered.forEach((item, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage()
        y = 15
      }
      if (idx % 2 === 1) {
        doc.setFillColor(245, 247, 250)
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, 'F')
      }
      const { available } = getStockInfo(item)
      const row = [
        String(idx + 1),
        (item.title || '').substring(0, 40),
        gradeLabel[item.grade] || item.grade,
        (item.subject || '-').substring(0, 22),
        (item.publisher || '-').substring(0, 28),
        Number(item.price).toLocaleString(),
        String(available)
      ]
      x = startX
      row.forEach((val, i) => { doc.text(val, x + 2, y + 5); x += colWidths[i] })
      y += rowH
    })

    doc.save(`inventory_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  const gradeLabel = { 
    kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', 
    p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', 
    m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' 
  }

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.subject || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  
  const lowStock = items.filter(i => {
    const { available, min } = getStockInfo(i)
    return available <= min
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="ml-3 text-gray-500">กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">จัดการหนังสือเรียน</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการหนังสือเรียนทั้งหมด ({items.length} รายการ)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={csvUploading} 
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {csvUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
            นำเข้า CSV
          </button>
          <button 
            onClick={exportCsv} 
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
          >
            <Download size={16} /> ส่งออก CSV
          </button>
          <button 
            onClick={exportPdf} 
            className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50"
          >
            <FileText size={16} /> ส่งออก PDF
          </button>
          <button 
            onClick={openAdd} 
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> เพิ่มหนังสือ
          </button>
        </div>
      </div>

      {/* Low Stock Warning */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-xl px-5 py-3">
          <AlertTriangle size={20} className="text-yellow-600" />
          <p className="text-sm">
            <span className="font-medium">แจ้งเตือน:</span> มี {lowStock.length} รายการที่สต็อกต่ำกว่าเกณฑ์
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <Package size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">หนังสือทั้งหมด</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50">
            <Package size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">มีสต็อก</p>
            <p className="text-2xl font-bold">
              {items.filter(i => {
                const { available } = getStockInfo(i)
                return available > 0
              }).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-50">
            <AlertTriangle size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">สต็อกต่ำ</p>
            <p className="text-2xl font-bold">{lowStock.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border p-5">
        <div className="relative mb-5">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อหนังสือ, กลุ่มสาระ..." 
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">ชื่อหนังสือ</th>
                <th className="text-left px-4 py-3 font-medium">ระดับชั้น</th>
                <th className="text-left px-4 py-3 font-medium">กลุ่มสาระ</th>
                <th className="text-right px-4 py-3 font-medium">ราคา</th>
                <th className="text-center px-4 py-3 font-medium">สต็อก</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map(item => {
                const { available, min } = getStockInfo(item)
                const isLow = available <= min
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.publisher || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {gradeLabel[item.grade] || item.grade}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.subject || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {Number(item.price).toLocaleString()} บาท
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEdit(item)} 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.title)} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              แสดง {(currentPage-1)*PAGE_SIZE+1} ถึง {Math.min(currentPage*PAGE_SIZE, filtered.length)} จาก {filtered.length}
            </p>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p-1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              {Array.from({length: totalPages}, (_, i) => i+1).map(p => (
                <button 
                  key={p} 
                  onClick={() => setCurrentPage(p)} 
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    p === currentPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} 
                disabled={currentPage === totalPages} 
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editItem ? 'แก้ไขหนังสือ' : 'เพิ่มหนังสือใหม่'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อหนังสือ *</label>
                <input 
                  type="text" 
                  className="input-field mt-1" 
                  value={form.title} 
                  onChange={e => setForm(p => ({...p, title: e.target.value}))} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">ราคา (บาท) *</label>
                <input 
                  type="number" 
                  className="input-field mt-1" 
                  value={form.price} 
                  onChange={e => setForm(p => ({...p, price: e.target.value}))} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">ระดับ</label>
                  <select 
                    className="input-field mt-1" 
                    value={form.level} 
                    onChange={e => setForm(p => ({...p, level: e.target.value}))}
                  >
                    <option value="kindergarten">อนุบาล</option>
                    <option value="primary">ประถม</option>
                    <option value="secondary">มัธยม</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">ชั้นเรียน</label>
                  <select 
                    className="input-field mt-1" 
                    value={form.grade} 
                    onChange={e => setForm(p => ({...p, grade: e.target.value}))}
                  >
                    <option value="kg2">อนุบาล 2</option>
                    <option value="kg3">อนุบาล 3</option>
                    <option value="p1">ป.1</option>
                    <option value="p2">ป.2</option>
                    <option value="p3">ป.3</option>
                    <option value="p4">ป.4</option>
                    <option value="p5">ป.5</option>
                    <option value="p6">ป.6</option>
                    <option value="m1">ม.1</option>
                    <option value="m2">ม.2</option>
                    <option value="m3">ม.3</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">ผู้แต่ง</label>
                  <input 
                    type="text" 
                    className="input-field mt-1" 
                    value={form.author} 
                    onChange={e => setForm(p => ({...p, author: e.target.value}))} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">กลุ่มสาระการเรียนรู้</label>
                  <select 
                    className="input-field mt-1" 
                    value={form.subject} 
                    onChange={e => setForm(p => ({...p, subject: e.target.value}))}
                  >
                    <option value="">-- เลือกกลุ่มสาระ --</option>
                    {subjectGroupOptions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">สำนักพิมพ์</label>
                <input 
                  type="text" 
                  className="input-field mt-1" 
                  value={form.publisher} 
                  onChange={e => setForm(p => ({...p, publisher: e.target.value}))} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave} 
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
