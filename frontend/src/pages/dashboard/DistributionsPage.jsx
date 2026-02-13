import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { UserCheck, Search, Loader2, BookOpen, Printer, FileText, Eye, Users, CheckCircle2, XCircle, History, Gift } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Swal from 'sweetalert2'

const gradeLabel = {
  kg2: 'อนุบาล 2',
  kg3: 'อนุบาล 3',
  p1: 'ประถมศึกษาปีที่ 1',
  p2: 'ประถมศึกษาปีที่ 2',
  p3: 'ประถมศึกษาปีที่ 3',
  p4: 'ประถมศึกษาปีที่ 4',
  p5: 'ประถมศึกษาปีที่ 5',
  p6: 'ประถมศึกษาปีที่ 6',
  m1: 'มัธยมศึกษาปีที่ 1',
  m2: 'มัธยมศึกษาปีที่ 2',
  m3: 'มัธยมศึกษาปีที่ 3'
}

const gradeShortLabel = {
  kg2: 'อ.2', kg3: 'อ.3',
  p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6',
  m1: 'ม.1', m2: 'ม.2', m3: 'ม.3'
}

const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']

export default function DistributionsPage() {
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState([])
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedYear, setSelectedYear] = useState((new Date().getFullYear() + 543).toString())
  const [selectedSemester, setSelectedSemester] = useState('1')
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().slice(0, 10))
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const printRef = useRef(null)

  // สำหรับ Modal แจกนักเรียน
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectedBooks, setSelectedBooks] = useState([])
  const [distributionHistory, setDistributionHistory] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [activeTab, setActiveTab] = useState('distribute') // 'distribute' or 'history'
  const [searchStudent, setSearchStudent] = useState('')

  // สำหรับพิมพ์บัญชีแจกหนังสือรายบุคคล
  const [showStudentPrintPreview, setShowStudentPrintPreview] = useState(false)
  const [selectedStudentForPrint, setSelectedStudentForPrint] = useState(null)
  const [studentDistributions, setStudentDistributions] = useState([])
  const [loadingStudentDistributions, setLoadingStudentDistributions] = useState(false)
  const studentPrintRef = useRef(null)

  // Generate year options (current year +/- 2 years in Buddhist Era)
  const currentBuddhistYear = new Date().getFullYear() + 543
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentBuddhistYear - 2 + i).toString())

  useEffect(() => {
    if (selectedGrade && selectedYear) {
      fetchBooksByGrade()
      fetchDistributionHistory()
    } else {
      setBooks([])
      setDistributionHistory([])
    }
  }, [selectedGrade, selectedYear])

  const fetchBooksByGrade = async () => {
    setLoading(true)
    try {
      console.log('Fetching book_stock for:', { selectedGrade, selectedYear })

      // ดึงข้อมูลหนังสือจาก book_stock โดยใช้ distributed_quantity (จำนวนที่แจกไปแล้ว)
      const { data: stockData, error: stockError } = await supabase
        .from('book_stock')
        .select(`
          id,
          book_id,
          grade,
          academic_year,
          quantity,
          available_quantity,
          distributed_quantity,
          books(id, title, price, subject)
        `)
        .eq('grade', selectedGrade)
        .eq('academic_year', selectedYear)
        .gt('distributed_quantity', 0) // เฉพาะหนังสือที่มีการแจกไปแล้ว

      if (stockError) {
        console.error('Error fetching book_stock:', stockError)
        setBooks([])
        setLoading(false)
        return
      }

      console.log('Book stock found:', stockData?.length || 0, stockData)

      // แปลงข้อมูลเป็นรูปแบบที่ใช้แสดงผล (แบ่งให้นักเรียนคนละเล่ม)
      const booksData = (stockData || [])
        .filter(stock => stock.books) // กรองเฉพาะที่มีข้อมูลหนังสือ
        .map(stock => ({
          id: stock.id,
          book_id: stock.book_id,
          book_stock_id: stock.id,
          title: stock.books.title,
          subject: stock.books.subject,
          quantity: stock.distributed_quantity, // จำนวนเล่มที่แจกไปแล้ว = จำนวนนักเรียนที่ได้รับ (คนละ 1 เล่ม)
          available_quantity: stock.available_quantity,
        }))

      setBooks(booksData)
    } catch (err) {
      console.error('Fetch error:', err)
      setBooks([])
    }
    setLoading(false)
  }

  // ดึงข้อมูลหนังสือที่มีในคลัง (ยังไม่จำเป็นต้องมี distributed_quantity > 0)
  const fetchAvailableBooks = async () => {
    try {
      const { data: stockData, error: stockError } = await supabase
        .from('book_stock')
        .select(`
          id,
          book_id,
          grade,
          academic_year,
          quantity,
          available_quantity,
          distributed_quantity,
          books(id, title, price, subject)
        `)
        .eq('grade', selectedGrade)
        .eq('academic_year', selectedYear)
        .gt('quantity', 0)

      if (stockError) {
        console.error('Error fetching available books:', stockError)
        return []
      }

      return (stockData || [])
        .filter(stock => stock.books)
        .map(stock => ({
          id: stock.id,
          book_id: stock.book_id,
          book_stock_id: stock.id,
          title: stock.books.title,
          subject: stock.books.subject,
          available_quantity: stock.available_quantity,
          distributed_quantity: stock.distributed_quantity,
        }))
    } catch (err) {
      console.error('Fetch available books error:', err)
      return []
    }
  }

  // ดึงข้อมูลนักเรียนตามชั้นเรียน
  const fetchStudentsByGrade = async () => {
    setLoadingStudents(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('grade', selectedGrade)
        .order('gender', { ascending: false }) // ชาย (male) ก่อน หญิง (female)
        .order('student_id')

      if (error) {
        console.error('Error fetching students:', error)
        setStudents([])
      } else {
        // ดึงข้อมูลว่านักเรียนคนไหนได้รับหนังสือเล่มไหนไปแล้ว
        const { data: distributions } = await supabase
          .from('student_book_distributions')
          .select('student_id, book_id')
          .eq('grade', selectedGrade)
          .eq('academic_year', selectedYear)

        const distributedMap = {}
        ;(distributions || []).forEach(d => {
          if (!distributedMap[d.student_id]) {
            distributedMap[d.student_id] = new Set()
          }
          distributedMap[d.student_id].add(d.book_id)
        })

        const studentsWithStatus = (data || []).map(s => ({
          ...s,
          distributed_books: distributedMap[s.id] || new Set()
        }))

        setStudents(studentsWithStatus)
      }
    } catch (err) {
      console.error('Fetch students error:', err)
      setStudents([])
    }
    setLoadingStudents(false)
  }

  // ดึงประวัติการแจกหนังสือ
  const fetchDistributionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('student_book_distributions')
        .select(`
          id,
          distribution_date,
          semester,
          notes,
          created_at,
          students(id, student_id, prefix, first_name, last_name, gender),
          books(id, title, subject)
        `)
        .eq('grade', selectedGrade)
        .eq('academic_year', selectedYear)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching distribution history:', error)
        setDistributionHistory([])
      } else {
        setDistributionHistory(data || [])
      }
    } catch (err) {
      console.error('Fetch history error:', err)
      setDistributionHistory([])
    }
  }

  // ดึงรายการหนังสือที่นักเรียนคนหนึ่งได้รับ
  const fetchStudentDistributions = async (studentId) => {
    setLoadingStudentDistributions(true)
    try {
      const { data, error } = await supabase
        .from('student_book_distributions')
        .select(`
          id,
          distribution_date,
          semester,
          notes,
          books(id, title, subject)
        `)
        .eq('student_id', studentId)
        .eq('grade', selectedGrade)
        .eq('academic_year', selectedYear)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching student distributions:', error)
        setStudentDistributions([])
      } else {
        setStudentDistributions(data || [])
      }
    } catch (err) {
      console.error('Fetch student distributions error:', err)
      setStudentDistributions([])
    }
    setLoadingStudentDistributions(false)
  }

  // เปิด Modal พิมพ์บัญชีแจกหนังสือรายบุคคล
  const openStudentPrintPreview = async (student) => {
    setSelectedStudentForPrint(student)
    setShowStudentPrintPreview(true)
    await fetchStudentDistributions(student.id)
  }

  const formatThaiDate = (dateString) => {
    if (!dateString) return { day: '...', month: '...', year: '...' }
    const date = new Date(dateString)
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    return {
      day: date.getDate().toString(),
      month: thaiMonths[date.getMonth()],
      year: (date.getFullYear() + 543).toString()
    }
  }

  const formatShortThaiDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    const year = date.getFullYear() + 543
    return `${day} ${month} ${year}`
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>บัญชีแจกหนังสือเรียน ชั้น${gradeLabel[selectedGrade] || ''}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Sarabun', sans-serif; }
            @media print {
              @page { size: A4; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${printContent}</body>
        </html>
      `)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  // พิมพ์บัญชีแจกหนังสือรายบุคคล
  const handleStudentPrint = () => {
    if (studentPrintRef.current) {
      const printContent = studentPrintRef.current.innerHTML
      const studentName = selectedStudentForPrint
        ? `${selectedStudentForPrint.prefix}${selectedStudentForPrint.first_name} ${selectedStudentForPrint.last_name}`
        : ''
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>บัญชีแจกหนังสือเรียน ${studentName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Sarabun', sans-serif; }
            @media print {
              @page { size: A4; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${printContent}</body>
        </html>
      `)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  // Export PDF บัญชีแจกหนังสือรายบุคคล
  const exportStudentPDF = async () => {
    if (!studentPrintRef.current || !selectedStudentForPrint) return

    try {
      const element = studentPrintRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)

      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 0

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      const studentName = `${selectedStudentForPrint.first_name}_${selectedStudentForPrint.last_name}`
      pdf.save(`บัญชีแจกหนังสือ_${studentName}_${gradeShortLabel[selectedGrade] || ''}_${selectedYear}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }
  }

  const exportPDF = async () => {
    if (!printRef.current) return

    try {
      const element = printRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)

      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 0

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`บัญชีแจกหนังสือเรียน_${gradeLabel[selectedGrade] || 'unknown'}_${selectedYear}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }
  }

  const openPrintPreview = () => {
    if (books.length === 0) {
      alert('กรุณาเลือกชั้นเรียนและปีการศึกษาก่อน')
      return
    }
    setShowPrintPreview(true)
  }

  // เปิด Modal แจกนักเรียน
  const openDistributeModal = async () => {
    if (!selectedGrade) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกชั้นเรียน',
        text: 'กรุณาเลือกชั้นเรียนก่อนแจกหนังสือ',
        confirmButtonColor: '#2563eb'
      })
      return
    }

    setShowDistributeModal(true)
    setSelectedStudents([])
    setSelectedBooks([])
    setActiveTab('distribute')
    setSearchStudent('')

    // ดึงข้อมูลนักเรียนและหนังสือ
    await fetchStudentsByGrade()
    const availableBooks = await fetchAvailableBooks()
    setSelectedBooks(availableBooks.map(b => ({ ...b, selected: false })))
  }

  // เลือก/ยกเลิกนักเรียนทั้งหมด
  const toggleSelectAllStudents = () => {
    const filteredStudents = students.filter(s =>
      `${s.student_id} ${s.first_name} ${s.last_name}`.toLowerCase().includes(searchStudent.toLowerCase())
    )
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  // เลือก/ยกเลิกนักเรียน
  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // เลือก/ยกเลิกหนังสือทั้งหมด
  const toggleSelectAllBooks = () => {
    const allSelected = selectedBooks.every(b => b.selected)
    setSelectedBooks(selectedBooks.map(b => ({ ...b, selected: !allSelected })))
  }

  // เลือก/ยกเลิกหนังสือ
  const toggleBook = (bookStockId) => {
    setSelectedBooks(selectedBooks.map(b =>
      b.book_stock_id === bookStockId ? { ...b, selected: !b.selected } : b
    ))
  }

  // บันทึกการแจกหนังสือ
  const handleDistribute = async () => {
    const selectedBooksList = selectedBooks.filter(b => b.selected)

    if (selectedStudents.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกนักเรียน',
        text: 'กรุณาเลือกนักเรียนอย่างน้อย 1 คน',
        confirmButtonColor: '#2563eb'
      })
      return
    }

    if (selectedBooksList.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกหนังสือ',
        text: 'กรุณาเลือกหนังสืออย่างน้อย 1 เล่ม',
        confirmButtonColor: '#2563eb'
      })
      return
    }

    // สร้างรายการแจก (กรองเฉพาะที่ยังไม่ได้รับ)
    const distributionRecords = []
    const skippedCount = { students: 0, books: 0 }

    for (const studentId of selectedStudents) {
      const student = students.find(s => s.id === studentId)
      if (!student) continue

      for (const book of selectedBooksList) {
        // ตรวจสอบว่านักเรียนได้รับหนังสือเล่มนี้ไปแล้วหรือยัง
        if (student.distributed_books && student.distributed_books.has(book.book_id)) {
          skippedCount.books++
          continue
        }

        distributionRecords.push({
          student_id: studentId,
          book_id: book.book_id,
          book_stock_id: book.book_stock_id,
          academic_year: selectedYear,
          grade: selectedGrade,
          distribution_date: distributionDate,
          semester: selectedSemester,
        })
      }
    }

    if (distributionRecords.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'นักเรียนได้รับหนังสือแล้ว',
        text: 'นักเรียนที่เลือกได้รับหนังสือที่เลือกทั้งหมดไปแล้ว',
        confirmButtonColor: '#2563eb'
      })
      return
    }

    // ยืนยันการแจก
    const confirmResult = await Swal.fire({
      title: 'ยืนยันการแจกหนังสือ',
      html: `
        <div class="text-left">
          <p>นักเรียนที่เลือก: <strong>${selectedStudents.length}</strong> คน</p>
          <p>หนังสือที่เลือก: <strong>${selectedBooksList.length}</strong> เล่ม</p>
          <p>จำนวนรายการแจก: <strong>${distributionRecords.length}</strong> รายการ</p>
          ${skippedCount.books > 0 ? `<p class="text-orange-600 text-sm mt-2">* ข้ามรายการที่เคยแจกแล้ว ${skippedCount.books} รายการ</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันแจก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280'
    })

    if (!confirmResult.isConfirmed) return

    setDistributing(true)

    try {
      // บันทึกลงฐานข้อมูล
      const { error } = await supabase
        .from('student_book_distributions')
        .insert(distributionRecords)

      if (error) {
        console.error('Error saving distributions:', error)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.message,
          confirmButtonColor: '#2563eb'
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: 'แจกหนังสือสำเร็จ',
          text: `แจกหนังสือให้นักเรียน ${distributionRecords.length} รายการ`,
          timer: 2000,
          showConfirmButton: false
        })

        // รีเฟรชข้อมูล
        await fetchStudentsByGrade()
        await fetchDistributionHistory()
        await fetchBooksByGrade()

        // Reset selections
        setSelectedStudents([])
        setSelectedBooks(prev => prev.map(b => ({ ...b, selected: false })))
      }
    } catch (err) {
      console.error('Distribute error:', err)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกการแจกหนังสือได้',
        confirmButtonColor: '#2563eb'
      })
    }

    setDistributing(false)
  }

  // ลบรายการแจก
  const handleDeleteDistribution = async (id, studentName, bookTitle) => {
    const result = await Swal.fire({
      title: 'ยืนยันลบรายการแจก',
      html: `ต้องการลบรายการแจก<br/>"${bookTitle}"<br/>ให้ "${studentName}" หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280'
    })

    if (!result.isConfirmed) return

    const { error } = await supabase
      .from('student_book_distributions')
      .delete()
      .eq('id', id)

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'ลบไม่สำเร็จ',
        text: error.message
      })
    } else {
      Swal.fire({
        icon: 'success',
        title: 'ลบสำเร็จ',
        timer: 1200,
        showConfirmButton: false
      })
      await fetchDistributionHistory()
      await fetchStudentsByGrade()
      await fetchBooksByGrade()
    }
  }

  // กรองนักเรียนตามการค้นหา
  const filteredStudents = students.filter(s =>
    `${s.student_id} ${s.first_name} ${s.last_name}`.toLowerCase().includes(searchStudent.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="text-blue-600" />
            แจกหนังสือให้นักเรียน
          </h1>
          <p className="text-gray-500 text-sm mt-1">บัญชีแจกหนังสือเรียนตามชั้น</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">เลือกข้อมูลสำหรับแจกหนังสือ</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Grade Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นเรียน</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="input-field w-full"
            >
              <option value="">-- เลือกชั้นเรียน --</option>
              {gradeOptions.map(grade => (
                <option key={grade} value={grade}>{gradeLabel[grade]}</option>
              ))}
            </select>
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field w-full"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ภาคเรียน</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="input-field w-full"
            >
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
          </div>

          {/* Distribution Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">วันที่แจก</label>
            <input
              type="date"
              value={distributionDate}
              onChange={(e) => setDistributionDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={openDistributeModal}
            disabled={!selectedGrade}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift size={18} />
            แจกนักเรียน
          </button>
          <button
            onClick={openPrintPreview}
            disabled={!selectedGrade || books.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={18} />
            ดูตัวอย่างก่อนพิมพ์
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      {/* Books Table Preview */}
      {!loading && selectedGrade && books.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">
            รายการหนังสือที่แจกแล้ว ชั้น{gradeLabel[selectedGrade]} ปีการศึกษา {selectedYear}
          </h3>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-16">เลขที่</th>
                  <th>รายชื่อหนังสือ</th>
                  <th className="w-24 text-center">จำนวน(เล่ม)</th>
                  <th className="w-32 text-center">วัน/เดือน/ปีที่แจก</th>
                  <th className="w-24 text-center">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, idx) => (
                  <tr key={book.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{book.title}</td>
                    <td className="text-center">{book.quantity}</td>
                    <td className="text-center">{formatShortThaiDate(distributionDate)}</td>
                    <td className="text-center">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            รวมทั้งหมด {books.length} รายการ (รวม {books.reduce((sum, b) => sum + b.quantity, 0)} เล่ม แจกนักเรียนคนละ 1 เล่ม)
          </p>
        </div>
      )}

      {/* Student Distribution Summary - รายชื่อนักเรียนที่ได้รับหนังสือ พร้อมปุ่มพิมพ์ */}
      {!loading && selectedGrade && distributionHistory.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-green-600" />
            รายชื่อนักเรียนที่ได้รับหนังสือ - พิมพ์บัญชีรายบุคคล
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* สร้าง unique students จาก distributionHistory */}
            {(() => {
              const uniqueStudents = new Map()
              distributionHistory.forEach(item => {
                if (item.students?.id && !uniqueStudents.has(item.students.id)) {
                  uniqueStudents.set(item.students.id, {
                    ...item.students,
                    bookCount: distributionHistory.filter(d => d.students?.id === item.students.id).length
                  })
                }
              })
              return Array.from(uniqueStudents.values()).map(student => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-blue-200 hover:bg-blue-50 transition-all"
                >
                  <div className="flex-1">
                    <div className={`font-medium ${student.gender === 'female' ? 'text-pink-600' : 'text-sky-600'}`}>
                      {student.prefix}{student.first_name} {student.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      รหัส: {student.student_id} | ได้รับ {student.bookCount} เล่ม
                    </div>
                  </div>
                  <button
                    onClick={() => openStudentPrintPreview(student)}
                    className="ml-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                    title="พิมพ์บัญชีแจกหนังสือ"
                  >
                    <Printer size={14} />
                    พิมพ์
                  </button>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Distribution History */}
      {!loading && selectedGrade && distributionHistory.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History size={20} className="text-blue-600" />
            ประวัติการแจกหนังสือ (ล่าสุด 100 รายการ)
          </h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>รหัสนักเรียน</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>หนังสือ</th>
                  <th className="text-center">วันที่แจก</th>
                  <th className="text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {distributionHistory.slice(0, 20).map((item, idx) => (
                  <tr key={item.id}>
                    <td className="text-center text-gray-400">{idx + 1}</td>
                    <td className="font-mono text-blue-700">{item.students?.student_id || '-'}</td>
                    <td>
                      <span className={item.students?.gender === 'female' ? 'text-pink-600' : 'text-sky-600'}>
                        {item.students?.prefix} {item.students?.first_name} {item.students?.last_name}
                      </span>
                    </td>
                    <td>{item.books?.title || '-'}</td>
                    <td className="text-center">{formatShortThaiDate(item.distribution_date)}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openStudentPrintPreview(item.students)}
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          title="พิมพ์บัญชีแจกหนังสือ"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDistribution(
                            item.id,
                            `${item.students?.first_name} ${item.students?.last_name}`,
                            item.books?.title
                          )}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                          title="ลบรายการ"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {distributionHistory.length > 20 && (
            <p className="text-sm text-gray-400 mt-2 text-center">
              แสดง 20 รายการแรก จากทั้งหมด {distributionHistory.length} รายการ
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedGrade && books.length === 0 && distributionHistory.length === 0 && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">ไม่พบข้อมูลการแจกหนังสือ</p>
              <p className="text-sm mt-1">คลิกปุ่ม "แจกนักเรียน" เพื่อเริ่มบันทึกการแจก</p>
            </div>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && !selectedGrade && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">กรุณาเลือกชั้นเรียน</p>
              <p className="text-sm mt-1">เลือกชั้นเรียนเพื่อดูรายการหนังสือที่จะแจก</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">ตัวอย่างบัญชีแจกหนังสือเรียน</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer size={16} /> พิมพ์
                </button>
                <button
                  onClick={exportPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
                >
                  <FileText size={16} /> บันทึก PDF
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div
                ref={printRef}
                className="bg-white mx-auto shadow-lg"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '15mm',
                  fontFamily: 'Sarabun, sans-serif',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                <div className="print-container">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold mb-1">บัญชีแจกหนังสือเรียน ภาคเรียนที่ {selectedSemester} ปีการศึกษา {selectedYear}</h1>
                    <p className="text-base mb-1">โรงเรียนบ้านค้อดอนแคน อำเภอกู่แก้ว จังหวัดอุดรธานี</p>
                    <p className="text-base">ชั้น{gradeLabel[selectedGrade] || ''}</p>
                  </div>

                  {/* Table */}
                  <table className="w-full border-collapse text-sm mb-8" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '45px' }}>เลขที่</th>
                        <th className="border border-gray-600 p-2 bg-white text-center">รายชื่อหนังสือ</th>
                        <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '70px' }}>จำนวน(เล่ม)</th>
                        <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '110px' }}>วัน/เดือน/ปีที่แจก</th>
                        <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '70px' }}>หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.map((book, idx) => (
                        <tr key={book.id}>
                          <td className="border border-gray-600 p-2 text-center">{idx + 1}</td>
                          <td className="border border-gray-600 p-2 text-left" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{book.title}</td>
                          <td className="border border-gray-600 p-2 text-center">{book.quantity}</td>
                          <td className="border border-gray-600 p-2 text-center">{formatShortThaiDate(distributionDate)}</td>
                          <td className="border border-gray-600 p-2 text-center"></td>
                        </tr>
                      ))}
                      {/* Empty rows to fill minimum 10 rows */}
                      {Array.from({ length: Math.max(0, 10 - books.length) }).map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                          <td className="border border-gray-600 p-2 h-8">&nbsp;</td>
                          <td className="border border-gray-600 p-2">&nbsp;</td>
                          <td className="border border-gray-600 p-2">&nbsp;</td>
                          <td className="border border-gray-600 p-2">&nbsp;</td>
                          <td className="border border-gray-600 p-2">&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signature Section */}
                  <div className="mt-12">
                    {/* Row 1: ผู้รับหนังสือ and ครูประจำชั้น */}
                    <div className="flex justify-between mb-12">
                      {/* Left - ผู้รับหนังสือ */}
                      <div className="w-5/12 text-center">
                        <div className="mb-2">
                          <span className="text-sm">(ลงชื่อ)........................................................ผู้รับหนังสือ</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm">(..................................................)</span>
                        </div>
                      </div>

                      {/* Right - ครูประจำชั้น */}
                      <div className="w-5/12 text-center">
                        <div className="mb-2">
                          <span className="text-sm">(ลงชื่อ)........................................................ครูประจำชั้น</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm">(..................................................)</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: ผู้อำนวยการโรงเรียน (centered) */}
                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="mb-2">
                          <span className="text-sm">(ลงชื่อ)........................................................ผู้อำนวยการโรงเรียน</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm">(..................................................)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Distribute Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Gift size={24} />
                แจกหนังสือให้นักเรียน - ชั้น{gradeLabel[selectedGrade]}
              </h3>
              <p className="text-blue-100 text-sm mt-1">ปีการศึกษา {selectedYear} ภาคเรียนที่ {selectedSemester}</p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Panel - Students */}
              <div className="w-1/2 border-r flex flex-col">
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      รายชื่อนักเรียน ({filteredStudents.length} คน)
                    </h4>
                    <button
                      onClick={toggleSelectAllStudents}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedStudents.length === filteredStudents.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ค้นหานักเรียน..."
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loadingStudents ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="ml-2 text-gray-500">กำลังโหลด...</span>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      ไม่พบนักเรียนในชั้นนี้
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudents.includes(student.id)
                        const hasDistributed = student.distributed_books && student.distributed_books.size > 0

                        return (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudent(student.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${student.gender === 'female' ? 'text-pink-600' : 'text-sky-600'}`}>
                                  {student.prefix} {student.first_name} {student.last_name}
                                </span>
                                {hasDistributed && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                    ได้รับแล้ว {student.distributed_books.size} เล่ม
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                รหัส: {student.student_id}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-600" />
                    เลือกแล้ว: <span className="font-semibold text-blue-600">{selectedStudents.length}</span> คน
                  </div>
                </div>
              </div>

              {/* Right Panel - Books */}
              <div className="w-1/2 flex flex-col">
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BookOpen size={18} className="text-green-600" />
                      รายการหนังสือ ({selectedBooks.length} เล่ม)
                    </h4>
                    <button
                      onClick={toggleSelectAllBooks}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      {selectedBooks.every(b => b.selected) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedBooks.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      ไม่พบหนังสือในคลัง
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBooks.map((book) => (
                        <label
                          key={book.book_stock_id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            book.selected
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={book.selected}
                            onChange={() => toggleBook(book.book_stock_id)}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{book.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {book.subject || 'ไม่ระบุวิชา'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen size={16} className="text-green-600" />
                    เลือกแล้ว: <span className="font-semibold text-green-600">{selectedBooks.filter(b => b.selected).length}</span> เล่ม
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                วันที่แจก: <span className="font-medium">{formatShortThaiDate(distributionDate)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDistributeModal(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-100"
                >
                  ปิด
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={distributing || selectedStudents.length === 0 || selectedBooks.filter(b => b.selected).length === 0}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {distributing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Gift size={16} />
                      แจกหนังสือ ({selectedStudents.length} คน x {selectedBooks.filter(b => b.selected).length} เล่ม)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Print Preview Modal - พิมพ์บัญชีแจกหนังสือรายบุคคล */}
      {showStudentPrintPreview && selectedStudentForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                บัญชีแจกหนังสือเรียน - {selectedStudentForPrint.prefix}{selectedStudentForPrint.first_name} {selectedStudentForPrint.last_name}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleStudentPrint}
                  disabled={loadingStudentDistributions || studentDistributions.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={16} /> พิมพ์
                </button>
                <button
                  onClick={exportStudentPDF}
                  disabled={loadingStudentDistributions || studentDistributions.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={16} /> บันทึก PDF
                </button>
                <button
                  onClick={() => {
                    setShowStudentPrintPreview(false)
                    setSelectedStudentForPrint(null)
                    setStudentDistributions([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              {loadingStudentDistributions ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
                </div>
              ) : studentDistributions.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">ไม่พบข้อมูลการแจกหนังสือ</p>
                    <p className="text-sm mt-1">นักเรียนคนนี้ยังไม่ได้รับหนังสือในปีการศึกษานี้</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={studentPrintRef}
                  className="bg-white mx-auto shadow-lg"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '15mm',
                    fontFamily: 'Sarabun, sans-serif',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                >
                  <div className="print-container">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h1 className="text-xl font-bold mb-1">บัญชีแจกหนังสือเรียน ภาคเรียนที่ {selectedSemester} ปีการศึกษา {selectedYear}</h1>
                      <p className="text-base mb-1">โรงเรียนบ้านค้อดอนแคน อำเภอกู่แก้ว จังหวัดอุดรธานี</p>
                      <p className="text-base">ชั้น{gradeLabel[selectedGrade] || ''}</p>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse text-sm mb-8" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '45px' }}>เลขที่</th>
                          <th className="border border-gray-600 p-2 bg-white text-center">รายชื่อหนังสือ</th>
                          <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '70px' }}>จำนวน(เล่ม)</th>
                          <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '110px' }}>วัน/เดือน/ปีที่แจก</th>
                          <th className="border border-gray-600 p-2 bg-white text-center" style={{ width: '70px' }}>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentDistributions.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="border border-gray-600 p-2 text-center">{idx + 1}</td>
                            <td className="border border-gray-600 p-2 text-left" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.books?.title || '-'}</td>
                            <td className="border border-gray-600 p-2 text-center">1</td>
                            <td className="border border-gray-600 p-2 text-center">{formatShortThaiDate(item.distribution_date)}</td>
                            <td className="border border-gray-600 p-2 text-center">{item.notes || ''}</td>
                          </tr>
                        ))}
                        {/* Empty rows to fill minimum 10 rows */}
                        {Array.from({ length: Math.max(0, 10 - studentDistributions.length) }).map((_, idx) => (
                          <tr key={`empty-${idx}`}>
                            <td className="border border-gray-600 p-2 h-8">&nbsp;</td>
                            <td className="border border-gray-600 p-2">&nbsp;</td>
                            <td className="border border-gray-600 p-2">&nbsp;</td>
                            <td className="border border-gray-600 p-2">&nbsp;</td>
                            <td className="border border-gray-600 p-2">&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Signature Section */}
                    <div className="mt-12">
                      {/* Row 1: ผู้รับหนังสือ and ครูประจำชั้น */}
                      <div className="flex justify-between mb-12">
                        {/* Left - ผู้รับหนังสือ */}
                        <div className="w-5/12 text-center">
                          <div className="mb-2">
                            <span className="text-sm">(ลงชื่อ)........................................................ผู้รับหนังสือ</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm">(...{selectedStudentForPrint.prefix}{selectedStudentForPrint.first_name} {selectedStudentForPrint.last_name}...)</span>
                          </div>
                        </div>

                        {/* Right - ครูประจำชั้น */}
                        <div className="w-5/12 text-center">
                          <div className="mb-2">
                            <span className="text-sm">(ลงชื่อ)........................................................ครูประจำชั้น</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm">(..................................................)</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: ผู้อำนวยการโรงเรียน (centered) */}
                      <div className="flex justify-center">
                        <div className="text-center">
                          <div className="mb-2">
                            <span className="text-sm">(ลงชื่อ)........................................................ผู้อำนวยการโรงเรียน</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-sm">(..................................................)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
