import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Search, Save, Download, Calendar, BookOpen, Info, Loader2, CheckCircle } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const PAGE_SIZE = 10
const subjectGroupOptions = [
  'ปฐมวัย', 'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ภาษาต่างประเทศ',
]

export default function MyOrdersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [books, setBooks] = useState([])
  const [students, setStudents] = useState([])
  const [budgets, setBudgets] = useState([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543)

  // oldBooks = จำนวนหนังสือเก่า, newOrder = จำนวนสั่งซื้อใหม่ (per book)
  const [oldBooks, setOldBooks] = useState({})
  const [newOrders, setNewOrders] = useState({})

  // ครูประจำชั้น / ครูประจำวิชา
  const [teacherGrade, setTeacherGrade] = useState('')
  const [teacherRoom, setTeacherRoom] = useState('')
  const [teacherSubjects, setTeacherSubjects] = useState([])

  // ข้อมูลหนังสือส่งแล้ว และ รับเอาไปแจก
  const [deliveredBooks, setDeliveredBooks] = useState({})
  const [distributedBooks, setDistributedBooks] = useState({})

  // ดึงข้อมูลชั้นครูจาก users table
  useEffect(() => {
    const fetchTeacherInfo = async () => {
      if (!user?.id) return
      // ลองจาก user object ก่อน
      let grade = user?.homeroom_grade || user?.user_metadata?.homeroom_grade || ''
      let room = user?.homeroom_room || user?.user_metadata?.homeroom_room || ''
      let subjects = user?.homeroom_subjects || []
      // ถ้าไม่มี ดึงจาก users table
      if (!grade && (!subjects || subjects.length === 0)) {
        const { data } = await supabase.from('users').select('homeroom_grade, homeroom_room, homeroom_subjects').eq('id', user.id).single()
        if (data) {
          grade = data.homeroom_grade || ''
          room = data.homeroom_room || ''
          subjects = data.homeroom_subjects || []
        }
      }
      setTeacherGrade(grade)
      setTeacherRoom(room)
      setTeacherSubjects(subjects || [])
    }
    fetchTeacherInfo()
  }, [user])

  // ดึงข้อมูลเมื่อมี teacherGrade หรือ teacherSubjects
  useEffect(() => {
    if (teacherGrade || (teacherSubjects && teacherSubjects.length > 0)) fetchData()
  }, [selectedYear, teacherGrade, teacherSubjects?.length])

  const fetchData = async () => {
    setLoading(true)

    // ดึงหนังสือตามชั้นของครู หรือ ตามกลุ่มสาระของครูประจำวิชา
    let bookQuery = supabase.from('books').select('*').eq('is_active', true).order('grade').order('title')
    if (teacherGrade) {
      // ครูประจำชั้น - กรองตามชั้น
      bookQuery = bookQuery.eq('grade', teacherGrade)
    } else if (teacherSubjects && teacherSubjects.length > 0) {
      // ครูประจำวิชา - กรองตามกลุ่มสาระ
      bookQuery = bookQuery.in('subject', teacherSubjects)
    }

    const [bookRes, studentRes, budgetRes, existingOrderRes, deliveredRes, distributedRes] = await Promise.all([
      bookQuery,
      supabase.from('students').select('grade, classroom'),
      supabase.from('budgets').select('*').eq('year', selectedYear),
      // ดึง order เดิมของครูในปีนี้ (ถ้ามี)
      supabase.from('orders')
        .select('id, order_items(book_id, quantity, old_quantity)')
        .eq('teacher_id', user.id)
        .eq('year', selectedYear)
        .eq('grade', teacherGrade || 'p1')
        .single(),
      // ดึงข้อมูลหนังสือที่ส่งแล้ว (จาก book_receipt_items)
      supabase.from('book_receipt_items').select('book_id, received_qty'),
      // ดึงข้อมูลหนังสือที่แจกแล้ว (จาก student_book_distributions)
      supabase.from('student_book_distributions').select('book_id').eq('academic_year', String(selectedYear))
    ])

    setBooks(bookRes.data || [])
    setStudents(studentRes.data || [])
    setBudgets(budgetRes.data || [])

    // คำนวณจำนวนหนังสือส่งแล้ว (รวมต่อ book_id)
    const deliveredMap = {}
    ;(deliveredRes.data || []).forEach(item => {
      deliveredMap[item.book_id] = (deliveredMap[item.book_id] || 0) + (item.received_qty || 0)
    })
    setDeliveredBooks(deliveredMap)

    // คำนวณจำนวนหนังสือที่แจกแล้ว (นับต่อ book_id)
    const distributedMap = {}
    ;(distributedRes.data || []).forEach(item => {
      distributedMap[item.book_id] = (distributedMap[item.book_id] || 0) + 1
    })
    setDistributedBooks(distributedMap)

    // ตั้งค่า oldBooks และ newOrders
    const initOld = {}
    const initNew = {}
    const existingItems = existingOrderRes.data?.order_items || []

    ;(bookRes.data || []).forEach(b => {
      // หาข้อมูลเดิมจาก order_items (ถ้ามี)
      const savedItem = existingItems.find(item => item.book_id === b.id)

      if (savedItem) {
        // มีข้อมูลเดิม ใช้ค่าที่บันทึกไว้
        initOld[b.id] = savedItem.old_quantity || 0
        initNew[b.id] = savedItem.quantity || 0
      } else {
        // ไม่มีข้อมูลเดิม คำนวณใหม่
        initOld[b.id] = 0
        const studentCount = (studentRes.data || []).filter(s => {
          if (teacherGrade && teacherRoom) return s.grade === b.grade && s.classroom === teacherRoom
          return s.grade === b.grade
        }).length
        initNew[b.id] = studentCount
      }
    })
    setOldBooks(initOld)
    setNewOrders(initNew)
    setLoading(false)
  }

  const handleOldChange = (bookId, value) => {
    const val = Math.max(0, Number(value) || 0)
    setOldBooks(p => ({ ...p, [bookId]: val }))
    // คำนวณสั่งซื้อใหม่ = นร.ทั้งหมด - หนังสือเก่า
    const book = books.find(b => b.id === bookId)
    if (book) {
      const studentCount = students.filter(s => {
        if (teacherGrade && teacherRoom) return s.grade === book.grade && s.classroom === teacherRoom
        return s.grade === book.grade
      }).length
      const newCount = Math.max(0, studentCount - val)
      setNewOrders(p => ({ ...p, [bookId]: newCount }))
    }
  }

  const handleNewChange = (bookId, value) => {
    setNewOrders(p => ({ ...p, [bookId]: Math.max(0, Number(value) || 0) }))
  }

  // กด Enter เพื่อย้ายไปแถวถัดไป
  const handleKeyDown = (e, idx, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const nextIdx = idx + 1
      if (nextIdx < paginated.length) {
        const nextInput = document.getElementById(`${field}-${nextIdx}`)
        if (nextInput) nextInput.focus()
      }
    }
  }

  // เลือกข้อความทั้งหมดเมื่อ focus เพื่อพิมพ์ทับได้เลย
  const handleFocus = (e) => {
    e.target.select()
  }

  // กรอง (หนังสือถูกกรองตามชั้นครูแล้วตอน fetch)
  const filtered = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.subject || '').toLowerCase().includes(search.toLowerCase())
      const matchSubject = subjectFilter === 'all' || b.subject === subjectFilter
      return matchSearch && matchSubject
    })
  }, [books, search, subjectFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // สรุป
  const summaryItems = filtered.filter(b => (newOrders[b.id] || 0) > 0)
  const totalSubjects = summaryItems.length
  const totalNewBooks = summaryItems.reduce((sum, b) => sum + (newOrders[b.id] || 0), 0)
  const totalAmount = summaryItems.reduce((sum, b) => sum + (newOrders[b.id] || 0) * Number(b.price || 0), 0)

  // งบประมาณ (ใช้ books แทน filtered เพื่อไม่ให้ budget เปลี่ยนตาม subject filter)
  const gradeBudget = budgets.find(bg => bg.grade === (teacherGrade || books[0]?.grade))
  const budgetAmount = gradeBudget ? Number(gradeBudget.amount) : 0
  const remaining = budgetAmount - totalAmount
  const usedPct = budgetAmount > 0 ? Math.round((totalAmount / budgetAmount) * 100) : 0

  // นร.ในชั้น
  const gradeStudentCount = students.filter(s => {
    if (teacherGrade && teacherRoom) return s.grade === teacherGrade && s.classroom === teacherRoom
    if (teacherGrade) return s.grade === teacherGrade
    return false
  }).length

  const handleSaveDraft = async () => {
    setSaving(true)
    const classroom = teacherGrade ? `${gradeLabel[teacherGrade]}/${teacherRoom || '1'}` : '-'

    // ตรวจสอบว่ามี order เดิมหรือไม่
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('year', selectedYear)
      .eq('grade', teacherGrade || 'p1')
      .single()

    let orderId = null

    if (existingOrder) {
      // อัพเดท order เดิม
      await supabase.from('orders').update({
        classroom,
        total_quantity: totalNewBooks,
        total_amount: totalAmount,
        status: 'draft',
        updated_at: new Date().toISOString(),
      }).eq('id', existingOrder.id)

      // ลบ order_items เดิม
      await supabase.from('order_items').delete().eq('order_id', existingOrder.id)
      orderId = existingOrder.id
    } else {
      // สร้าง order ใหม่เป็น draft
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        teacher_id: user.id,
        classroom,
        grade: teacherGrade || 'p1',
        year: selectedYear,
        total_quantity: totalNewBooks,
        total_amount: totalAmount,
        status: 'draft',
      }).select().single()

      if (orderError) {
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: orderError.message })
        setSaving(false)
        return
      }
      orderId = orderData.id
    }

    // บันทึก order items (รวมทุกหนังสือที่มีการกรอกข้อมูล)
    const items = books.filter(b => (newOrders[b.id] || 0) > 0 || (oldBooks[b.id] || 0) > 0).map(b => ({
      order_id: orderId,
      book_id: b.id,
      quantity: newOrders[b.id] || 0,
      old_quantity: oldBooks[b.id] || 0,
      unit_price: Number(b.price),
    }))

    if (items.length > 0) {
      await supabase.from('order_items').insert(items)
    }

    Swal.fire({ icon: 'success', title: 'บันทึกร่างสำเร็จ', timer: 1200, showConfirmButton: false })
    setSaving(false)
  }

  const handleSubmitOrder = async () => {
    if (totalNewBooks === 0) {
      Swal.fire({ icon: 'warning', title: 'ไม่มีรายการสั่งซื้อ', text: 'กรุณาระบุจำนวนหนังสือที่ต้องสั่งซื้อ', confirmButtonColor: '#2563eb' })
      return
    }

    const result = await Swal.fire({
      title: 'ยืนยันการสั่งซื้อ?',
      html: `<p>รายการวิชาที่สั่ง: <b>${totalSubjects}</b> รายการ</p><p>จำนวนเล่มใหม่: <b>${totalNewBooks}</b> เล่ม</p><p>ยอดรวม: <b>${totalAmount.toLocaleString()} บาท</b></p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการสั่งซื้อ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
    })
    if (!result.isConfirmed) return

    setSaving(true)

    const classroom = teacherGrade ? `${gradeLabel[teacherGrade]}/${teacherRoom || '1'}` : '-'

    // ตรวจสอบว่ามี order เดิมของครูคนนี้ในปีนี้หรือไม่
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('teacher_id', user.id)
      .eq('year', selectedYear)
      .eq('grade', teacherGrade || 'p1')
      .single()

    let orderId = null
    let orderNumber = null

    if (existingOrder) {
      // อัพเดท order เดิม
      const { error: updateError } = await supabase.from('orders').update({
        classroom,
        total_quantity: totalNewBooks,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      }).eq('id', existingOrder.id)

      if (updateError) {
        Swal.fire({ icon: 'error', title: 'อัพเดทคำสั่งซื้อไม่สำเร็จ', text: updateError.message })
        setSaving(false)
        return
      }

      // ลบ order_items เดิม
      await supabase.from('order_items').delete().eq('order_id', existingOrder.id)

      orderId = existingOrder.id
      orderNumber = existingOrder.order_number
    } else {
      // สร้าง order ใหม่
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        teacher_id: user.id,
        classroom,
        grade: teacherGrade || 'p1',
        year: selectedYear,
        total_quantity: totalNewBooks,
        total_amount: totalAmount,
      }).select().single()

      if (orderError) {
        Swal.fire({ icon: 'error', title: 'สร้างคำสั่งซื้อไม่สำเร็จ', text: orderError.message })
        setSaving(false)
        return
      }

      orderId = orderData.id
      orderNumber = orderData.order_number
    }

    // สร้าง order items ใหม่ (รวมทุกหนังสือที่มีการกรอกข้อมูล)
    const items = books.filter(b => (newOrders[b.id] || 0) > 0 || (oldBooks[b.id] || 0) > 0).map(b => ({
      order_id: orderId,
      book_id: b.id,
      quantity: newOrders[b.id] || 0,
      old_quantity: oldBooks[b.id] || 0,
      unit_price: Number(b.price),
    }))

    const { error: itemError } = await supabase.from('order_items').insert(items)
    if (itemError) {
      Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: itemError.message })
    } else {
      Swal.fire({
        icon: 'success',
        title: existingOrder ? 'อัพเดทคำสั่งซื้อสำเร็จ' : 'สั่งซื้อสำเร็จ',
        text: `เลขที่: ${orderNumber}`,
        confirmButtonColor: '#2563eb'
      })
    }

    setSaving(false)
  }

  const exportExcel = () => {
    const header = ['#', 'ชื่อรายวิชา', 'รหัสวิชา', 'ระดับชั้น', 'ราคา/เล่ม', 'นร.ทั้งหมด', 'หนังสือเก่า', 'สั่งซื้อใหม่', 'หนังสือส่งแล้ว', 'รับเอาไปแจก', 'รวมเป็นเงิน']
    const rows = filtered.map((b, i) => {
      const count = students.filter(s => s.grade === b.grade).length
      return [i + 1, b.title, b.isbn || '-', gradeLabel[b.grade], Number(b.price).toFixed(2), count, oldBooks[b.id] || 0, newOrders[b.id] || 0, deliveredBooks[b.id] || 0, distributedBooks[b.id] || 0, ((newOrders[b.id] || 0) * Number(b.price)).toFixed(2)]
    })
    const csv = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileLabel = teacherGrade ? gradeLabel[teacherGrade] : (teacherSubjects.length > 0 ? 'ครูประจำวิชา' : 'ทั้งหมด')
    a.download = `สำรวจหนังสือ_${fileLabel}_${selectedYear}.csv`
    a.click()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span></div>
  }

  if (!teacherGrade && (!teacherSubjects || teacherSubjects.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Info size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">ยังไม่ได้กำหนดชั้นเรียนหรือกลุ่มสาระ</h2>
        <p className="text-gray-500 dark:text-gray-400">กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดชั้นเรียนหรือกลุ่มสาระที่รับผิดชอบ</p>
      </div>
    )
  }

  if (budgetAmount === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">บันทึกความต้องการสั่งซื้อหนังสือเรียน</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Calendar size={14} /> ปีการศึกษา {selectedYear}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <div className="mb-4">
            <label htmlFor="select-year-nobudget" className="text-xs text-gray-500 dark:text-gray-400">ปีการศึกษา</label>
            <select id="select-year-nobudget" name="academicYearNoBudget" className="input-field mt-1 dark:bg-gray-700 dark:text-white dark:border-gray-600" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {[0, -1, 1].map(d => { const y = new Date().getFullYear() + 543 + d; return <option key={`year-nobudget-${y}`} value={y}>{y}</option> })}
            </select>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info size={48} className="text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">ไม่พบงบประมาณสำหรับปีการศึกษา {selectedYear}</h2>
            <p className="text-gray-500 dark:text-gray-400">กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดงบประมาณ หรือเลือกปีการศึกษาอื่น</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">บันทึกความต้องการสั่งซื้อหนังสือเรียน</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Calendar size={14} /> ปีการศึกษา {selectedYear}</span>
            {teacherGrade && <span>• <BookOpen size={14} className="inline" /> ภาคเรียนที่ 1</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">งบประมาณคงเหลือ</span>
            <p className={`text-lg font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{remaining.toLocaleString()} บาท</p>
          </div>
          <button onClick={handleSaveDraft} className="flex items-center gap-2 px-4 py-2.5 border dark:border-gray-700 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
            <Save size={16} /> บันทึกร่าง
          </button>
          <button onClick={handleSubmitOrder} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} ยืนยันการสั่งซื้อ
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - ข้อมูลพื้นฐาน */}
        <div className="w-full lg:w-72 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-4 dark:text-white">
              <BookOpen size={18} className="text-blue-600" /> ข้อมูลพื้นฐาน
            </h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="select-year" className="text-xs text-gray-500 dark:text-gray-400">ปีการศึกษา</label>
                <select id="select-year" name="academicYear" className="input-field mt-1 dark:bg-gray-700 dark:text-white dark:border-gray-600" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                  {[0, -1, 1].map(d => { const y = new Date().getFullYear() + 543 + d; return <option key={`year-${y}`} value={y}>{y}</option> })}
                </select>
              </div>
              {teacherGrade && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">ชั้นที่รับผิดชอบ</label>
                  <div className="input-field mt-1 bg-blue-50 dark:bg-blue-900/30 text-center font-semibold text-blue-700 dark:text-blue-300">{gradeLabel[teacherGrade]}{teacherRoom ? `/${teacherRoom}` : ''} ({gradeStudentCount} คน)</div>
                </div>
              )}
              {!teacherGrade && teacherSubjects && teacherSubjects.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">กลุ่มสาระที่รับผิดชอบ</label>
                  <div className="mt-1 space-y-1">
                    {teacherSubjects.map((subj, idx) => (
                      <span key={idx} className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded mr-1 mb-1">{subj}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">งบประมาณที่ได้รับ (บาท)</label>
                <div className="input-field mt-1 bg-gray-50 dark:bg-gray-700 text-center font-semibold dark:text-white">{budgetAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* สรุปรายการ */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <h3 className="font-semibold mb-3 dark:text-white">สรุปรายการ</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">รายการวิชาที่สั่ง</span>
                <span className="font-medium dark:text-white">{totalSubjects} รายการ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">จำนวนเล่มใหม่</span>
                <span className="font-medium dark:text-white">{totalNewBooks.toLocaleString()} เล่ม</span>
              </div>
              <hr className="my-2 dark:border-gray-700" />
              <div className="flex justify-between">
                <span className="font-medium dark:text-white">ยอดรวมสุทธิ</span>
                <span className={`text-lg font-bold ${totalAmount > budgetAmount && budgetAmount > 0 ? 'text-red-600' : 'text-blue-600'}`}>{totalAmount.toLocaleString()} บาท</span>
              </div>
            </div>

            {budgetAmount > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={usedPct > 100 ? 'text-red-600' : 'text-green-600'}>ใช้ไป {usedPct}%</span>
                  <span className="text-gray-400 dark:text-gray-500">เหลือ {remaining.toLocaleString()} บาท</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${usedPct > 100 ? 'bg-red-500' : usedPct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main - ตารางหนังสือ */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="ค้นหารายวิชา..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
              </div>
              {teacherGrade && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">ชั้น:</span>
                  <div className="border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{gradeLabel[teacherGrade]}{teacherRoom ? `/${teacherRoom}` : ''}</div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="select-subject" className="text-gray-500 dark:text-gray-400">กลุ่มสาระ:</label>
                <select id="select-subject" name="subjectFilter" className="border dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm dark:bg-gray-700 dark:text-white" value={subjectFilter} onChange={e => { setSubjectFilter(e.target.value); setCurrentPage(1) }}>
                  <option key="subject-all" value="all">ทั้งหมด</option>
                  {subjectGroupOptions.map(s => <option key={`subject-${s}`} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-2.5 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"><Download size={14} /> Excel</button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <th className="text-center px-3 py-3 font-medium w-10">#</th>
                    <th className="text-left px-3 py-3 font-medium">ชื่อรายวิชา</th>
                    <th className="text-left px-3 py-3 font-medium w-32">กลุ่มสาระ</th>
                    <th className="text-center px-3 py-3 font-medium w-20">ระดับชั้น</th>
                    <th className="text-right px-3 py-3 font-medium w-24">ราคา/เล่ม</th>
                    <th className="text-center px-3 py-3 font-medium w-20">นร. ทั้งหมด</th>
                    <th className="text-center px-3 py-3 font-medium w-24">หนังสือเก่า</th>
                    <th className="text-center px-3 py-3 font-medium w-24">สั่งซื้อใหม่</th>
                    <th className="text-center px-3 py-3 font-medium w-24">หนังสือส่งแล้ว</th>
                    <th className="text-center px-3 py-3 font-medium w-24">รับเอาไปแจก</th>
                    <th className="text-right px-3 py-3 font-medium w-28">รวมเป็นเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginated.map((book, idx) => {
                    const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1
                    const studentCount = students.filter(s => {
                      if (teacherGrade && teacherRoom) return s.grade === book.grade && s.classroom === teacherRoom
                      return s.grade === book.grade
                    }).length
                    const oldCount = oldBooks[book.id] || 0
                    const newCount = newOrders[book.id] || 0
                    const rowTotal = newCount * Number(book.price || 0)

                    return (
                      <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 py-3 text-center text-gray-400 dark:text-gray-500">{globalIdx}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium dark:text-white">{book.title}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{book.subject || '-'}</td>
                        <td className="px-3 py-3 text-center dark:text-white">{gradeLabel[book.grade]}</td>
                        <td className="px-3 py-3 text-right dark:text-white">{Number(book.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-3 text-center font-medium dark:text-white">{studentCount}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            id={`oldBooks-${idx}`}
                            type="number"
                            min="0"
                            className="w-16 text-center border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            value={oldCount}
                            onChange={e => handleOldChange(book.id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'oldBooks')}
                            onFocus={handleFocus}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            id={`newOrders-${idx}`}
                            type="number"
                            min="0"
                            className="w-16 text-center border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newCount}
                            onChange={e => handleNewChange(book.id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, idx, 'newOrders')}
                            onFocus={handleFocus}
                          />
                        </td>
                        <td className="px-3 py-3 text-center text-green-600 dark:text-green-400 font-medium">{deliveredBooks[book.id] || 0}</td>
                        <td className="px-3 py-3 text-center text-purple-600 dark:text-purple-400 font-medium">{distributedBooks[book.id] || 0}</td>
                        <td className="px-3 py-3 text-right font-medium dark:text-white">{rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">ไม่พบรายการหนังสือ</td></tr>
                  )}
                </tbody>
                {paginated.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700 font-medium">
                      <td colSpan={5}></td>
                      <td className="px-3 py-3 text-center dark:text-white">รวมทั้งหมด</td>
                      <td></td>
                      <td className="px-3 py-3 text-center text-blue-600 font-bold">{totalNewBooks.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-green-600 font-bold">{Object.values(deliveredBooks).reduce((a, b) => a + b, 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-purple-600 font-bold">{Object.values(distributedBooks).reduce((a, b) => a + b, 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-blue-600 font-bold">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">แสดง {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</p>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 dark:text-white">&lt;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white'}`}>{p}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 dark:text-white">&gt;</button>
                </div>
              </div>
            )}
          </div>

          {/* คำแนะนำ */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-4">
            <h4 className="font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-2">
              <Info size={16} /> คำแนะนำการใช้งาน
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc pl-5">
              <li>กรอกจำนวน <b>"หนังสือเก่า"</b> ที่มีอยู่แล้วในท้องสมุดหรือคลังโรงเรียน</li>
              <li>ระบบจะคำนวณยอดที่ต้อง <b>"สั่งซื้อใหม่"</b> ให้โดยอัตโนมัติ (จำนวนนักเรียนทั้งหมด – หนังสือเก่า)</li>
              <li>ตรวจสอบยอดรวมเงินเทียบกับงบประมาณที่มุมซ้ายบน</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
