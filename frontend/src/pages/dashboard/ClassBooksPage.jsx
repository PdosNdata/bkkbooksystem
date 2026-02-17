import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Search, BookOpen, ShoppingCart, Loader2, Plus, Minus } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }

export default function ClassBooksPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [cart, setCart] = useState({}) // { bookId: quantity }

  useEffect(() => { fetchBooks() }, [])

  const fetchBooks = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('books')
      .select('*, inventory(stock_quantity)')
      .eq('is_active', true)
      .order('grade', { ascending: true })
    setBooks(data || [])
    setLoading(false)
  }

  const updateCart = (bookId, delta) => {
    setCart(prev => {
      const current = prev[bookId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [bookId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [bookId]: next }
    })
  }

  const cartItems = Object.entries(cart).map(([bookId, qty]) => {
    const book = books.find(b => b.id === bookId)
    return { book, qty }
  }).filter(i => i.book)

  const totalQuantity = cartItems.reduce((s, i) => s + i.qty, 0)
  const totalAmount = cartItems.reduce((s, i) => s + (i.qty * Number(i.book.price)), 0)

  const handleOrder = async () => {
    if (cartItems.length === 0) {
      Swal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกหนังสือ', confirmButtonColor: '#2563eb' })
      return
    }
    const result = await Swal.fire({
      title: 'ยืนยันการสั่งซื้อ?',
      html: `<p>จำนวน ${totalQuantity} เล่ม</p><p>ยอดรวม ${totalAmount.toLocaleString()} บาท</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'สั่งซื้อ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
    })
    if (!result.isConfirmed) return

    const currentYear = new Date().getFullYear() + 543
    const grade = cartItems[0].book.grade

    // สร้าง order
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      teacher_id: user.id,
      classroom: user.classroom || gradeLabel[grade] || '-',
      grade: grade,
      year: currentYear,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
    }).select().single()

    if (orderErr) {
      Swal.fire({ icon: 'error', title: 'สั่งซื้อไม่สำเร็จ', text: orderErr.message })
      return
    }

    // สร้าง order items
    const items = cartItems.map(i => ({
      order_id: order.id,
      book_id: i.book.id,
      quantity: i.qty,
      unit_price: Number(i.book.price),
      total_price: i.qty * Number(i.book.price),
    }))
    await supabase.from('order_items').insert(items)

    setCart({})
    Swal.fire({ icon: 'success', title: 'สั่งซื้อสำเร็จ', text: `รหัสคำสั่งซื้อ: ${order.order_number}`, confirmButtonColor: '#2563eb' })
  }

  const filtered = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) || (b.subject || '').toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === 'all' || b.grade === gradeFilter
    return matchSearch && matchGrade
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">รายการหนังสือเรียน</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">เลือกหนังสือเรียนเพื่อสั่งซื้อ</p>
        </div>
        {totalQuantity > 0 && (
          <button onClick={handleOrder} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
            <ShoppingCart size={16} />
            สั่งซื้อ ({totalQuantity} เล่ม — {totalAmount.toLocaleString()} บาท)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ค้นหาชื่อหนังสือ หรือ วิชา..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
          <option value="all">ทุกชั้นเรียน</option>
          {Object.entries(gradeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Book Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(book => {
          const stock = book.inventory?.[0]?.stock_quantity || 0
          const qty = cart[book.id] || 0
          return (
            <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate dark:text-white">{book.title}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-300 mt-0.5">{book.subject || '-'} | {gradeLabel[book.grade]}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-300">{book.publisher || '-'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-lg font-bold text-blue-600">{Number(book.price).toLocaleString()} บาท</p>
                  <p className={`text-xs ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    คงเหลือ: {stock} เล่ม
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateCart(book.id, -1)} disabled={qty === 0} className="w-8 h-8 border dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 dark:text-gray-200">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-medium dark:text-white">{qty}</span>
                  <button onClick={() => updateCart(book.id, 1)} className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-300">ไม่พบหนังสือ</div>
        )}
      </div>
    </div>
  )
}
