import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Printer, Download, FileText, Loader2, Calendar, BookX, Filter } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">รายงาน</h1>
          <p className="text-gray-500 text-sm mt-1">สรุปภาพรวมระบบสั่งหนังสือเรียน</p>
        </div>
        <div className="flex gap-3">
          <select className="border rounded-xl px-4 py-2.5 text-sm" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[0, -1, -2, 1].map(d => { const y = new Date().getFullYear() + 543 + d; return <option key={y} value={y}>{y}</option> })}
          </select>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm hover:bg-gray-50">
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
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">งบประมาณทั้งหมด</p>
          <p className="text-xl font-bold mt-1">{totalBudget.toLocaleString()} บาท</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">ใช้ไปแล้ว</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{totalUsed.toLocaleString()} บาท</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">คำสั่งซื้อทั้งหมด</p>
          <p className="text-xl font-bold mt-1">{totalOrders} รายการ</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">ยอดสั่งซื้อรวม</p>
          <p className="text-xl font-bold mt-1 text-green-600">{totalOrderAmount.toLocaleString()} บาท</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">งบประมาณตามระดับชั้น</h3>
          <div className="h-64">
            {budgets.length > 0 ? (
              <Bar data={budgetChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">ยังไม่มีข้อมูลงบประมาณ</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">สถานะคำสั่งซื้อ</h3>
          <div className="h-64">
            {totalOrders > 0 ? (
              <Doughnut data={orderStatusData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">ยังไม่มีคำสั่งซื้อ</div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Detail Table */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText size={20} className="text-blue-600" /> รายละเอียดงบประมาณตามชั้นเรียน</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">ระดับชั้น</th>
                <th className="text-right px-4 py-3 font-medium">งบประมาณ</th>
                <th className="text-right px-4 py-3 font-medium">ใช้ไปแล้ว</th>
                <th className="text-right px-4 py-3 font-medium">คงเหลือ</th>
                <th className="text-center px-4 py-3 font-medium">สัดส่วน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.map(b => {
                const amount = Number(b.amount)
                const used = Number(b.used_amount || 0)
                const pct = amount > 0 ? Math.round((used / amount) * 100) : 0
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">{gradeLabel[b.grade]}</td>
                    <td className="px-4 py-3 text-right">{amount.toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-right text-blue-600">{used.toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-right text-green-600">{(amount - used).toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-center">{pct}%</td>
                  </tr>
                )
              })}
              {budgets.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">ไม่มีข้อมูล</td></tr>}
              {budgets.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">รวมทั้งหมด</td>
                  <td className="px-4 py-3 text-right">{totalBudget.toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-right text-blue-600">{totalUsed.toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-right text-green-600">{(totalBudget - totalUsed).toLocaleString()} บาท</td>
                  <td className="px-4 py-3 text-center">{totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* รายงานหนังสือค้างส่ง */}
      <div className="bg-white rounded-xl border p-6 print:break-before-page">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BookX size={20} className="text-orange-600" />
          รายงานหนังสือค้างส่ง
        </h3>

        {/* ตัวกรอง */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">ตัวกรอง</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ปีการศึกษา */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ปีการศึกษา</label>
              <select
                value={pendingBooksYear}
                onChange={(e) => setPendingBooksYear(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* ชั้นเรียน */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชั้นเรียน</label>
              <select
                value={pendingBooksGrade}
                onChange={(e) => setPendingBooksGrade(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- ทุกชั้น --</option>
                {gradeOptions.map(grade => (
                  <option key={grade} value={grade}>{gradeLabel[grade]}</option>
                ))}
              </select>
            </div>

            {/* กลุ่มสาระ */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">กลุ่มสาระการเรียนรู้</label>
              <select
                value={pendingBooksSubject}
                onChange={(e) => setPendingBooksSubject(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
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
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium">จำนวนรายการ</p>
              <p className="text-2xl font-bold text-orange-700">{pendingBooks.length}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">จำนวนค้างส่งรวม</p>
              <p className="text-2xl font-bold text-blue-700">{pendingBooks.reduce((s, b) => s + b.available_quantity, 0).toLocaleString()} เล่ม</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-xs text-green-600 font-medium">แจกไปแล้ว</p>
              <p className="text-2xl font-bold text-green-700">{pendingBooks.reduce((s, b) => s + b.distributed_quantity, 0).toLocaleString()} เล่ม</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium">มูลค่าค้างส่ง</p>
              <p className="text-2xl font-bold text-purple-700">{pendingBooks.reduce((s, b) => s + (b.available_quantity * Number(b.price || 0)), 0).toLocaleString()} บาท</p>
            </div>
          </div>
        )}

        {/* ตารางหนังสือค้างส่ง */}
        {loadingPendingBooks ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-orange-600" size={24} />
            <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : pendingBooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50">
                  <th className="text-center px-3 py-3 font-medium w-12">#</th>
                  <th className="text-left px-3 py-3 font-medium">ชื่อหนังสือ</th>
                  <th className="text-center px-3 py-3 font-medium w-24">ชั้น</th>
                  <th className="text-left px-3 py-3 font-medium">กลุ่มสาระ</th>
                  <th className="text-right px-3 py-3 font-medium w-20">ราคา</th>
                  <th className="text-center px-3 py-3 font-medium w-20">รับเข้า</th>
                  <th className="text-center px-3 py-3 font-medium w-20">แจกแล้ว</th>
                  <th className="text-center px-3 py-3 font-medium w-24">ค้างส่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingBooks.map((book, idx) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">{book.title}</td>
                    <td className="px-3 py-2 text-center">{gradeLabel[book.grade]}</td>
                    <td className="px-3 py-2 text-gray-600">{book.subjectGroup}</td>
                    <td className="px-3 py-2 text-right">{Number(book.price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">{book.quantity}</td>
                    <td className="px-3 py-2 text-center text-green-600">{book.distributed_quantity}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {book.available_quantity} เล่ม
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={5} className="px-3 py-3 text-right">รวมทั้งหมด</td>
                  <td className="px-3 py-3 text-center">{pendingBooks.reduce((s, b) => s + b.quantity, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-green-600">{pendingBooks.reduce((s, b) => s + b.distributed_quantity, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-orange-600">{pendingBooks.reduce((s, b) => s + b.available_quantity, 0).toLocaleString()} เล่ม</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <BookX size={40} className="mb-2 text-gray-300" />
            <p>ไม่พบข้อมูลหนังสือค้างส่ง</p>
            <p className="text-xs mt-1">เลือกตัวกรองเพื่อแสดงข้อมูล หรืออาจไม่มีหนังสือค้างส่งในปีการศึกษานี้</p>
          </div>
        )}
      </div>
    </div>
  )
}
