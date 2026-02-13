import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { UserCheck, Search, Loader2, BookOpen, Printer, FileText, Eye } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

  // Generate year options (current year +/- 2 years in Buddhist Era)
  const currentBuddhistYear = new Date().getFullYear() + 543
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentBuddhistYear - 2 + i).toString())

  useEffect(() => {
    if (selectedGrade && selectedYear) {
      fetchBooksByGrade()
    } else {
      setBooks([])
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
          title: stock.books.title,
          subject: stock.books.subject,
          quantity: stock.distributed_quantity, // จำนวนเล่มที่แจกไปแล้ว = จำนวนนักเรียนที่ได้รับ (คนละ 1 เล่ม)
        }))

      setBooks(booksData)
    } catch (err) {
      console.error('Fetch error:', err)
      setBooks([])
    }
    setLoading(false)
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
        <h2 className="text-lg font-semibold mb-4">เลือกข้อมูลสำหรับพิมพ์บัญชีแจก</h2>
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
        <div className="flex gap-3 mt-6">
          <button
            onClick={openPrintPreview}
            disabled={!selectedGrade || books.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            รายการหนังสือ ชั้น{gradeLabel[selectedGrade]} ปีการศึกษา {selectedYear}
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

      {/* Empty State */}
      {!loading && selectedGrade && books.length === 0 && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">ไม่พบข้อมูลหนังสือ</p>
              <p className="text-sm mt-1">ไม่พบข้อมูลการแจกหนังสือสำหรับชั้น{gradeLabel[selectedGrade]} ปี {selectedYear}</p>
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
    </div>
  )
}
