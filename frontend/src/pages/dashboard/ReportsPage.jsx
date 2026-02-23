import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Printer, Download, FileText, Loader2, Calendar, BookX, Filter } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']
const gradeFullLabel = {
  kg2: 'อนุบาล 2', kg3: 'อนุบาล 3',
  p1: 'ชั้นประถมศึกษาปีที่ 1', p2: 'ชั้นประถมศึกษาปีที่ 2', p3: 'ชั้นประถมศึกษาปีที่ 3',
  p4: 'ชั้นประถมศึกษาปีที่ 4', p5: 'ชั้นประถมศึกษาปีที่ 5', p6: 'ชั้นประถมศึกษาปีที่ 6',
  m1: 'ชั้นมัธยมศึกษาปีที่ 1', m2: 'ชั้นมัธยมศึกษาปีที่ 2', m3: 'ชั้นมัธยมศึกษาปีที่ 3',
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543)
  const [budgets, setBudgets] = useState([])
  const [orders, setOrders] = useState([])
  const reportRef = useRef(null)

  // สำหรับรายงานหนังสือค้างส่ง
  const [pendingBooksYear, setPendingBooksYear] = useState((new Date().getFullYear() + 543).toString())
  const [pendingBooksGrade, setPendingBooksGrade] = useState('')
  const [pendingBooksSubject, setPendingBooksSubject] = useState('')
  const [subjectGroups, setSubjectGroups] = useState([])
  const [pendingBooks, setPendingBooks] = useState([])
  const [loadingPendingBooks, setLoadingPendingBooks] = useState(false)

  // สรุปรายการหนังสือเรียนทั้งหมด
  const [summaryBooks, setSummaryBooks] = useState([])
  const [summaryOrderMap, setSummaryOrderMap] = useState({})
  const [summaryReceiptMap, setSummaryReceiptMap] = useState({}) // { book_id: { 1: qty, 2: qty } }
  const [summaryDistMap, setSummaryDistMap] = useState({})
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Generate year options for pending books (Buddhist Era)
  const currentBuddhistYear = new Date().getFullYear() + 543
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentBuddhistYear - 2 + i).toString())

  useEffect(() => { fetchData() }, [selectedYear])

  useEffect(() => { fetchSubjectGroups() }, [])

  useEffect(() => {
    if (pendingBooksYear) {
      fetchPendingBooks()
    }
  }, [pendingBooksYear, pendingBooksGrade, pendingBooksSubject])

  useEffect(() => { fetchSummaryReport() }, [selectedYear])

  const fetchData = async () => {
    setLoading(true)
    const [budgetRes, orderRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('year', selectedYear),
      supabase.from('orders').select('*').eq('year', selectedYear),
    ])
    setBudgets(budgetRes.data || [])
    setOrders(orderRes.data || [])
    setLoading(false)
  }

  // ดึงข้อมูลกลุ่มสาระการเรียนรู้
  const fetchSubjectGroups = async () => {
    const { data, error } = await supabase
      .from('typeofbooks')
      .select('id, name')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    if (!error && data) {
      setSubjectGroups(data)
    }
  }

  // ดึงข้อมูลหนังสือค้างส่ง
  const fetchPendingBooks = async () => {
    setLoadingPendingBooks(true)
    try {
      let query = supabase
        .from('book_stock')
        .select(`
          id,
          book_id,
          grade,
          academic_year,
          quantity,
          available_quantity,
          distributed_quantity,
          books(id, title, price, subject, typeofbook_id, typeofbooks:typeofbook_id(id, name))
        `)
        .eq('academic_year', pendingBooksYear)
        .gt('available_quantity', 0)

      if (pendingBooksGrade) {
        query = query.eq('grade', pendingBooksGrade)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching pending books:', error)
        setPendingBooks([])
      } else {
        // กรองตามกลุ่มสาระถ้าเลือก
        let filteredData = data || []
        if (pendingBooksSubject) {
          filteredData = filteredData.filter(item =>
            item.books?.typeofbooks?.id === pendingBooksSubject
          )
        }

        // แปลงข้อมูลเป็นรูปแบบที่ใช้แสดงผล
        const booksData = filteredData
          .filter(stock => stock.books)
          .map(stock => ({
            id: stock.id,
            book_id: stock.book_id,
            title: stock.books.title,
            subject: stock.books.subject,
            subjectGroup: stock.books.typeofbooks?.name || '-',
            grade: stock.grade,
            price: stock.books.price,
            quantity: stock.quantity,
            available_quantity: stock.available_quantity,
            distributed_quantity: stock.distributed_quantity,
          }))
          .sort((a, b) => {
            // เรียงตามชั้น แล้วตามชื่อหนังสือ
            const gradeOrder = gradeOptions.indexOf(a.grade) - gradeOptions.indexOf(b.grade)
            if (gradeOrder !== 0) return gradeOrder
            return a.title.localeCompare(b.title, 'th')
          })

        setPendingBooks(booksData)
      }
    } catch (err) {
      console.error('Fetch pending books error:', err)
      setPendingBooks([])
    }
    setLoadingPendingBooks(false)
  }

  const fetchSummaryReport = async () => {
    setLoadingSummary(true)
    try {
      const [booksRes, orderItemsRes, receiptsRes, distributionsRes] = await Promise.all([
        supabase.from('books').select('id, title, grade, subject, price').eq('is_active', true).order('grade').order('subject').order('title'),
        supabase.from('order_items').select('book_id, quantity, orders!inner(year)').eq('orders.year', selectedYear),
        supabase.from('book_receipt_items').select('book_id, received_qty, book_receipts!inner(delivery_number)'),
        supabase.from('student_book_distributions').select('book_id').eq('academic_year', String(selectedYear))
      ])

      setSummaryBooks(booksRes.data || [])

      const oMap = {}
      ;(orderItemsRes.data || []).forEach(item => {
        oMap[item.book_id] = (oMap[item.book_id] || 0) + (item.quantity || 0)
      })
      setSummaryOrderMap(oMap)

      const rMap = {}
      ;(receiptsRes.data || []).forEach(item => {
        const dn = item.book_receipts?.delivery_number || 1
        if (!rMap[item.book_id]) rMap[item.book_id] = {}
        rMap[item.book_id][dn] = (rMap[item.book_id][dn] || 0) + (item.received_qty || 0)
      })
      setSummaryReceiptMap(rMap)

      const dMap = {}
      ;(distributionsRes.data || []).forEach(item => {
        dMap[item.book_id] = (dMap[item.book_id] || 0) + 1
      })
      setSummaryDistMap(dMap)
    } catch (err) {
      console.error('Fetch summary error:', err)
    }
    setLoadingSummary(false)
  }

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const totalUsed = budgets.reduce((s, b) => s + Number(b.used_amount || 0), 0)
  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const approvedOrders = orders.filter(o => o.status === 'approved' || o.status === 'completed').length
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length
  const totalOrderAmount = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0)

  // กราฟงบประมาณตามชั้นเรียน
  const budgetChartData = {
    labels: budgets.map(b => gradeLabel[b.grade] || b.grade),
    datasets: [
      { label: 'งบประมาณ', data: budgets.map(b => Number(b.amount)), backgroundColor: '#3b82f6' },
      { label: 'ใช้ไปแล้ว', data: budgets.map(b => Number(b.used_amount || 0)), backgroundColor: '#f59e0b' },
    ],
  }

  // กราฟสถานะคำสั่งซื้อ
  const orderStatusData = {
    labels: ['อนุมัติ/สำเร็จ', 'รอดำเนินการ', 'กำลังจัดส่ง', 'ยกเลิก'],
    datasets: [{
      data: [
        orders.filter(o => o.status === 'approved' || o.status === 'completed').length,
        pendingOrders,
        orders.filter(o => o.status === 'shipping').length,
        cancelledOrders,
      ],
      backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'],
      borderWidth: 0,
    }],
  }

  const handlePrint = () => window.print()

  // ฟังก์ชันพิมพ์สรุปรายการหนังสือเรียน
  const handlePrintSummary = () => {
    if (summaryBooks.length === 0) return

    // จัดกลุ่มหนังสือตามชั้น แล้วตาม subject
    const grouped = {}
    gradeOptions.forEach(g => {
      const booksInGrade = summaryBooks.filter(b => b.grade === g)
      if (booksInGrade.length > 0) grouped[g] = booksInGrade
    })

    let tableRows = ''
    Object.entries(grouped).forEach(([grade, books]) => {
      const isKindergarten = grade.startsWith('kg')
      tableRows += `<tr><td colspan="8" style="background:#2563eb;color:white;font-weight:700;padding:8px;">${gradeFullLabel[grade]}</td></tr>`

      if (isKindergarten) {
        books.forEach(book => {
          const ordered = summaryOrderMap[book.id] || 0
          const r1 = summaryReceiptMap[book.id]?.[1] || 0
          const r2 = summaryReceiptMap[book.id]?.[2] || 0
          const totalReceived = r1 + r2
          const shortage = ordered - totalReceived
          const dist = summaryDistMap[book.id] || 0
          tableRows += `<tr>
            <td style="padding:6px 8px;">${book.title}</td>
            <td class="text-center">${ordered}</td>
            <td class="text-right">${Number(book.price || 0).toLocaleString()}</td>
            <td class="text-center">${r1}</td>
            <td class="text-center">${r2}</td>
            <td class="text-center">${totalReceived}</td>
            <td class="text-center" style="background:#fff1f2;">${shortage > 0 ? shortage : 0}</td>
            <td class="text-center" style="background:#eff6ff;">${dist}</td>
          </tr>`
        })
      } else {
        const subjectMap = {}
        books.forEach(book => {
          const subj = book.subject || 'อื่นๆ'
          if (!subjectMap[subj]) subjectMap[subj] = []
          subjectMap[subj].push(book)
        })
        Object.entries(subjectMap).forEach(([subject, sBooks]) => {
          tableRows += `<tr><td colspan="8" style="background:#dbeafe;font-weight:600;padding:6px 8px 6px 24px;">${subject}</td></tr>`
          sBooks.forEach(book => {
            const ordered = summaryOrderMap[book.id] || 0
            const r1 = summaryReceiptMap[book.id]?.[1] || 0
            const r2 = summaryReceiptMap[book.id]?.[2] || 0
            const totalReceived = r1 + r2
            const shortage = ordered - totalReceived
            const dist = summaryDistMap[book.id] || 0
            tableRows += `<tr>
              <td style="padding:6px 8px;">${book.title}</td>
              <td class="text-center">${ordered}</td>
              <td class="text-right">${Number(book.price || 0).toLocaleString()}</td>
              <td class="text-center">${r1}</td>
              <td class="text-center">${r2}</td>
              <td class="text-center">${totalReceived}</td>
              <td class="text-center" style="background:#fff1f2;">${shortage > 0 ? shortage : 0}</td>
              <td class="text-center" style="background:#eff6ff;">${dist}</td>
            </tr>`
          })
        })
      }
    })

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>สรุปรายการหนังสือเรียน ปีการศึกษา ${selectedYear}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Sarabun', sans-serif; font-size: 11pt; padding: 15mm; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 16pt; font-weight: 700; margin-bottom: 5px; }
          .header p { font-size: 10pt; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          th, td { border: 1px solid #ccc; padding: 5px 8px; }
          th { background: #2563eb; color: white; font-weight: 600; text-align: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .footer { margin-top: 20px; font-size: 9pt; color: #999; text-align: center; }
          @media print {
            body { padding: 5mm; }
            @page { size: A4 landscape; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>สรุปรายการหนังสือเรียน</h1>
          <p>โรงเรียนบ้านค้อดอนแคน — ปีการศึกษา ${selectedYear}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">รายการหนังสือ</th>
              <th rowspan="2">จำนวนใบสั่งซื้อ<br/>ทั้งสิ้น</th>
              <th rowspan="2">ราคา</th>
              <th colspan="3">ส่งสำนักพิมพ์</th>
              <th rowspan="2">ขาดส่งจริง<br/>ทั้งหมด</th>
              <th rowspan="2">แจกให้<br/>นักเรียน</th>
            </tr>
            <tr>
              <th>ครั้งที่ 1</th>
              <th>ครั้งที่ 2</th>
              <th>ส่งทั้งหมด</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // ฟังก์ชันพิมพ์รายงานหนังสือค้างส่ง
  const handlePrintPendingBooks = () => {
    if (pendingBooks.length === 0) return

    const totalQuantity = pendingBooks.reduce((s, b) => s + b.quantity, 0)
    const totalDistributed = pendingBooks.reduce((s, b) => s + b.distributed_quantity, 0)
    const totalPending = pendingBooks.reduce((s, b) => s + b.available_quantity, 0)
    const totalValue = pendingBooks.reduce((s, b) => s + (b.available_quantity * Number(b.price || 0)), 0)

    const gradeText = pendingBooksGrade ? gradeLabel[pendingBooksGrade] : 'ทุกชั้นเรียน'
    const subjectText = pendingBooksSubject
      ? subjectGroups.find(sg => sg.id === pendingBooksSubject)?.name || '-'
      : 'ทุกกลุ่มสาระ'

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานหนังสือค้างส่ง - ${pendingBooksYear}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Sarabun', sans-serif; font-size: 12pt; padding: 20mm; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18pt; font-weight: 700; margin-bottom: 5px; }
          .header p { font-size: 11pt; color: #666; }
          .filters { margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 10pt; }
          .filters span { margin-right: 20px; }
          .summary { display: flex; gap: 15px; margin-bottom: 20px; }
          .summary-item { flex: 1; padding: 10px; background: #f8f9fa; border-radius: 4px; text-align: center; }
          .summary-item .label { font-size: 9pt; color: #666; }
          .summary-item .value { font-size: 14pt; font-weight: 700; color: #333; }
          table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f97316; color: white; font-weight: 600; text-align: center; }
          td { vertical-align: middle; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-green { color: #16a34a; }
          .text-orange { color: #ea580c; }
          tfoot td { background: #f8f9fa; font-weight: 600; }
          .footer { margin-top: 30px; font-size: 10pt; color: #666; text-align: center; }
          @media print {
            body { padding: 10mm; }
            @page { size: A4 portrait; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานหนังสือค้างส่ง</h1>
          <p>โรงเรียนบ้านค้อดอนแคน — ปีการศึกษา ${pendingBooksYear}</p>
        </div>

        <div class="filters">
          <span><strong>ชั้นเรียน:</strong> ${gradeText}</span>
          <span><strong>กลุ่มสาระ:</strong> ${subjectText}</span>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="label">จำนวนรายการ</div>
            <div class="value">${pendingBooks.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">จำนวนค้างส่งรวม</div>
            <div class="value">${totalPending.toLocaleString()} เล่ม</div>
          </div>
          <div class="summary-item">
            <div class="label">แจกไปแล้ว</div>
            <div class="value">${totalDistributed.toLocaleString()} เล่ม</div>
          </div>
          <div class="summary-item">
            <div class="label">มูลค่าค้างส่ง</div>
            <div class="value">${totalValue.toLocaleString()} บาท</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="text-align: left;">ชื่อหนังสือ</th>
              <th style="width: 60px;">ชั้น</th>
              <th style="text-align: left;">กลุ่มสาระ</th>
              <th style="width: 70px;">ราคา</th>
              <th style="width: 60px;">รับเข้า</th>
              <th style="width: 60px;">แจกแล้ว</th>
              <th style="width: 70px;">ค้างส่ง</th>
            </tr>
          </thead>
          <tbody>
            ${pendingBooks.map((book, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${book.title}</td>
                <td class="text-center">${gradeLabel[book.grade]}</td>
                <td>${book.subjectGroup}</td>
                <td class="text-right">${Number(book.price || 0).toLocaleString()}</td>
                <td class="text-center">${book.quantity}</td>
                <td class="text-center text-green">${book.distributed_quantity}</td>
                <td class="text-center text-orange">${book.available_quantity}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right">รวมทั้งหมด</td>
              <td class="text-center">${totalQuantity.toLocaleString()}</td>
              <td class="text-center text-green">${totalDistributed.toLocaleString()}</td>
              <td class="text-center text-orange">${totalPending.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">รายงาน</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">สรุปภาพรวมระบบสั่งหนังสือเรียน</p>
        </div>
        <div className="flex gap-3">
          <select className="border dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[0, -1, -2, 1].map(d => { const y = new Date().getFullYear() + 543 + d; return <option key={y} value={y}>{y}</option> })}
          </select>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 border dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
            <Printer size={16} /> พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Report Header (for print) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">รายงานสรุปการสั่งหนังสือเรียน</h1>
        <p>ปีการศึกษา {selectedYear} — โรงเรียนบ้านค้อดอนแคน</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">งบประมาณทั้งหมด</p>
          <p className="text-xl font-bold mt-1 dark:text-white">{totalBudget.toLocaleString()} บาท</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">ใช้ไปแล้ว</p>
          <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalUsed.toLocaleString()} บาท</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">คำสั่งซื้อทั้งหมด</p>
          <p className="text-xl font-bold mt-1 dark:text-white">{totalOrders} รายการ</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">ยอดสั่งซื้อรวม</p>
          <p className="text-xl font-bold mt-1 text-green-600 dark:text-green-400">{totalOrderAmount.toLocaleString()} บาท</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h3 className="font-semibold mb-4 dark:text-white">งบประมาณตามระดับชั้น</h3>
          <div className="h-64">
            {budgets.length > 0 ? (
              <Bar data={budgetChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">ยังไม่มีข้อมูลงบประมาณ</div>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h3 className="font-semibold mb-4 dark:text-white">สถานะคำสั่งซื้อ</h3>
          <div className="h-64">
            {totalOrders > 0 ? (
              <Doughnut data={orderStatusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">ยังไม่มีคำสั่งซื้อ</div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Detail Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white"><FileText size={20} className="text-blue-600 dark:text-blue-400" /> รายละเอียดงบประมาณตามชั้นเรียน</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-4 py-3 font-medium dark:text-gray-200">ระดับชั้น</th>
                <th className="text-right px-4 py-3 font-medium dark:text-gray-200">งบประมาณ</th>
                <th className="text-right px-4 py-3 font-medium dark:text-gray-200">ใช้ไปแล้ว</th>
                <th className="text-right px-4 py-3 font-medium dark:text-gray-200">คงเหลือ</th>
                <th className="text-center px-4 py-3 font-medium dark:text-gray-200">สัดส่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {budgets.map(b => {
                const amount = Number(b.amount)
                const used = Number(b.used_amount || 0)
                const pct = amount > 0 ? Math.round((used / amount) * 100) : 0
                return (
                  <tr key={b.id} className="dark:text-gray-200">
                    <td className="px-4 py-3 font-medium">{gradeLabel[b.grade]}</td>
                    <td className="px-4 py-3 text-right">{amount.toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{used.toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{(amount - used).toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-center">{pct}%</td>
                  </tr>
                )
              })}
              {budgets.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่มีข้อมูล</td></tr>}
              {budgets.length > 0 && (
                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold dark:text-gray-200">
                  <td className="px-4 py-3">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-right">{totalBudget.toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{totalUsed.toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{(totalBudget - totalUsed).toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-center">{totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* สรุปรายการหนังสือเรียน */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 print:break-before-page">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 dark:text-white">
            <FileText size={20} className="text-green-600 dark:text-green-400" />
            สรุปรายการหนังสือเรียนปีการศึกษา {selectedYear}
          </h3>
          {summaryBooks.length > 0 && !loadingSummary && (
            <button
              onClick={handlePrintSummary}
              className="flex items-center gap-2 px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 print:hidden"
            >
              <Printer size={16} />
              พิมพ์สรุปรายการ
            </button>
          )}
        </div>

        {loadingSummary ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-green-600 dark:text-green-400" size={24} />
            <span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</span>
          </div>
        ) : summaryBooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th rowSpan={2} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-medium">รายการหนังสือ</th>
                  <th rowSpan={2} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-28">จำนวนใบสั่งซื้อ<br/>ทั้งสิ้น</th>
                  <th rowSpan={2} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-20">ราคา</th>
                  <th colSpan={3} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium">ส่งสำนักพิมพ์</th>
                  <th rowSpan={2} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-24">ขาดส่งจริง<br/>ทั้งหมด</th>
                  <th rowSpan={2} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-24">แจกให้<br/>นักเรียน</th>
                </tr>
                <tr className="bg-blue-600 text-white">
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-20">ครั้งที่ 1</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-20">ครั้งที่ 2</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-medium w-20">ส่งทั้งหมด</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = []
                  gradeOptions.forEach(grade => {
                    const booksInGrade = summaryBooks.filter(b => b.grade === grade)
                    if (booksInGrade.length === 0) return

                    const isKindergarten = grade.startsWith('kg')

                    // Grade header row
                    rows.push(
                      <tr key={`grade-${grade}`}>
                        <td colSpan={8} className="border border-gray-200 dark:border-gray-700 px-3 py-2 bg-blue-600 text-white font-bold">
                          {gradeFullLabel[grade]}
                        </td>
                      </tr>
                    )

                    if (isKindergarten) {
                      // Kindergarten: no subject grouping
                      booksInGrade.forEach(book => {
                        const ordered = summaryOrderMap[book.id] || 0
                        const r1 = summaryReceiptMap[book.id]?.[1] || 0
                        const r2 = summaryReceiptMap[book.id]?.[2] || 0
                        const totalReceived = r1 + r2
                        const shortage = ordered - totalReceived
                        const dist = summaryDistMap[book.id] || 0
                        rows.push(
                          <tr key={`book-${book.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 dark:text-gray-200">{book.title}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{ordered}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right dark:text-gray-200">{Number(book.price || 0).toLocaleString()}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{r1}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{r2}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{totalReceived}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center bg-red-50 dark:bg-red-900/20 dark:text-gray-200">{shortage > 0 ? shortage : 0}</td>
                            <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center bg-blue-50 dark:bg-blue-900/20 dark:text-gray-200">{dist}</td>
                          </tr>
                        )
                      })
                    } else {
                      // Group by subject
                      const subjectMap = {}
                      booksInGrade.forEach(book => {
                        const subj = book.subject || 'อื่นๆ'
                        if (!subjectMap[subj]) subjectMap[subj] = []
                        subjectMap[subj].push(book)
                      })

                      Object.entries(subjectMap).forEach(([subject, sBooks]) => {
                        // Subject sub-header
                        rows.push(
                          <tr key={`subject-${grade}-${subject}`}>
                            <td colSpan={8} className="border border-gray-200 dark:border-gray-700 px-3 py-2 pl-6 bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-800 dark:text-blue-300">
                              {subject}
                            </td>
                          </tr>
                        )

                        sBooks.forEach(book => {
                          const ordered = summaryOrderMap[book.id] || 0
                          const r1 = summaryReceiptMap[book.id]?.[1] || 0
                          const r2 = summaryReceiptMap[book.id]?.[2] || 0
                          const totalReceived = r1 + r2
                          const shortage = ordered - totalReceived
                          const dist = summaryDistMap[book.id] || 0
                          rows.push(
                            <tr key={`book-${book.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 dark:text-gray-200">{book.title}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{ordered}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-right dark:text-gray-200">{Number(book.price || 0).toLocaleString()}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{r1}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{r2}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center dark:text-gray-200">{totalReceived}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center bg-red-50 dark:bg-red-900/20 dark:text-gray-200">{shortage > 0 ? shortage : 0}</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-center bg-blue-50 dark:bg-blue-900/20 dark:text-gray-200">{dist}</td>
                            </tr>
                          )
                        })
                      })
                    }
                  })
                  return rows
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <FileText size={40} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p>ไม่พบข้อมูลหนังสือเรียน</p>
            <p className="text-xs mt-1">ยังไม่มีรายการหนังสือในระบบ</p>
          </div>
        )}
      </div>

      {/* รายงานหนังสือค้างส่ง */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 print:break-before-page">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 dark:text-white">
            <BookX size={20} className="text-orange-600 dark:text-orange-400" />
            รายงานหนังสือค้างส่ง
          </h3>
          {pendingBooks.length > 0 && (
            <button
              onClick={handlePrintPendingBooks}
              className="flex items-center gap-2 px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 print:hidden"
            >
              <Printer size={16} />
              พิมพ์รายงานค้างส่ง
            </button>
          )}
        </div>

        {/* ตัวกรอง */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ตัวกรอง</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ปีการศึกษา */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ปีการศึกษา</label>
              <select
                value={pendingBooksYear}
                onChange={(e) => setPendingBooksYear(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* ชั้นเรียน */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ชั้นเรียน</label>
              <select
                value={pendingBooksGrade}
                onChange={(e) => setPendingBooksGrade(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">-- ทุกชั้น --</option>
                {gradeOptions.map(grade => (
                  <option key={grade} value={grade}>{gradeLabel[grade]}</option>
                ))}
              </select>
            </div>

            {/* กลุ่มสาระ */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">กลุ่มสาระการเรียนรู้</label>
              <select
                value={pendingBooksSubject}
                onChange={(e) => setPendingBooksSubject(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">-- ทุกกลุ่มสาระ --</option>
                {subjectGroups.map(sg => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* สรุปยอด */}
        {!loadingPendingBooks && pendingBooks.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 border border-orange-100 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">จำนวนรายการ</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{pendingBooks.length}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">จำนวนค้างส่งรวม</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pendingBooks.reduce((s, b) => s + b.available_quantity, 0).toLocaleString()} เล่ม</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-100 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">แจกไปแล้ว</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{pendingBooks.reduce((s, b) => s + b.distributed_quantity, 0).toLocaleString()} เล่ม</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">มูลค่าค้างส่ง</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{pendingBooks.reduce((s, b) => s + (b.available_quantity * Number(b.price || 0)), 0).toLocaleString()} บาท</p>
            </div>
          </div>
        )}

        {/* ตารางหนังสือค้างส่ง */}
        {loadingPendingBooks ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-orange-600 dark:text-orange-400" size={24} />
            <span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</span>
          </div>
        ) : pendingBooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 dark:bg-orange-900/30">
                  <th className="text-center px-3 py-3 font-medium w-12 dark:text-gray-200">#</th>
                  <th className="text-left px-3 py-3 font-medium dark:text-gray-200">ชื่อหนังสือ</th>
                  <th className="text-center px-3 py-3 font-medium w-24 dark:text-gray-200">ชั้น</th>
                  <th className="text-left px-3 py-3 font-medium dark:text-gray-200">กลุ่มสาระ</th>
                  <th className="text-right px-3 py-3 font-medium w-20 dark:text-gray-200">ราคา</th>
                  <th className="text-center px-3 py-3 font-medium w-20 dark:text-gray-200">รับเข้า</th>
                  <th className="text-center px-3 py-3 font-medium w-20 dark:text-gray-200">แจกแล้ว</th>
                  <th className="text-center px-3 py-3 font-medium w-24 dark:text-gray-200">ค้างส่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pendingBooks.map((book, idx) => (
                  <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-center text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 dark:text-gray-200">{book.title}</td>
                    <td className="px-3 py-2 text-center dark:text-gray-200">{gradeLabel[book.grade]}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{book.subjectGroup}</td>
                    <td className="px-3 py-2 text-right dark:text-gray-200">{Number(book.price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center dark:text-gray-200">{book.quantity}</td>
                    <td className="px-3 py-2 text-center text-green-600 dark:text-green-400">{book.distributed_quantity}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                        {book.available_quantity} เล่ม
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold dark:text-gray-200">
                  <td colSpan={5} className="px-3 py-3 text-right">รวมทั้งหมด</td>
                  <td className="px-3 py-3 text-center">{pendingBooks.reduce((s, b) => s + b.quantity, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-green-600 dark:text-green-400">{pendingBooks.reduce((s, b) => s + b.distributed_quantity, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-orange-600 dark:text-orange-400">{pendingBooks.reduce((s, b) => s + b.available_quantity, 0).toLocaleString()} เล่ม</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <BookX size={40} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p>ไม่พบข้อมูลหนังสือค้างส่ง</p>
            <p className="text-xs mt-1">เลือกตัวกรองเพื่อแสดงข้อมูล หรืออาจไม่มีหนังสือค้างส่งในปีการศึกษานี้</p>
          </div>
        )}
      </div>
    </div>
  )
}
