import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Search, BookOpen, Loader2 } from 'lucide-react'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }

export default function ClassBooksPage() {
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')

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
      <div>
        <h1 className="text-2xl font-bold dark:text-white">รายการหนังสือเรียน</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">รายการหนังสือเรียนของโรงเรียน</p>
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
        {filtered.map(book => (
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

              <div className="mt-4">
                <p className="text-lg font-bold text-blue-600">{Number(book.price).toLocaleString()} บาท</p>
              </div>
            </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-300">ไม่พบหนังสือ</div>
        )}
      </div>
    </div>
  )
}
