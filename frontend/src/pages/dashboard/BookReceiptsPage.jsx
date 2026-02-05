import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Package, Loader2, Calendar, Truck, CheckCircle, Save, Eye, BookOpen } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']
const PAGE_SIZE = 10

export default function BookReceiptsPage() {
  const [receipts, setReceipts] = useState([])
  const [allOrderItems, setAllOrderItems] = useState([])
  const [typeofbooks, setTypeofbooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Main receive modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [deliveryNumber, setDeliveryNumber] = useState(1)
  const [filteredBooks, setFilteredBooks] = useState([])
  const [receiveItems, setReceiveItems] = useState({})
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [loadingBooks, setLoadingBooks] = useState(false)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => { fetchData(); fetchTypeofbooks() }, [])

  // Fetch books when grade or subject changes
  useEffect(() => {
    if (selectedGrade && showReceiveModal) {
      fetchFilteredBooks()
    } else {
      setFilteredBooks([])
      setReceiveItems({})
    }
  }, [selectedGrade, selectedSubject, showReceiveModal])

  const fetchData = async () => {
    setLoading(true)

    // ดึงประวัติการรับหนังสือ
    const { data: receiptsData } = await supabase
      .from('book_receipts')
      .select(`
        *,
        book_receipt_items(book_id, received_qty, books(title, typeofbooks(name)))
      `)
      .order('receipt_date', { ascending: false })

    setReceipts(receiptsData || [])
    setLoading(false)
  }

  const fetchTypeofbooks = async () => {
    const { data } = await supabase
      .from('typeofbooks')
      .select('id, name')
      .order('name')
    setTypeofbooks(data || [])
  }

  const fetchFilteredBooks = async () => {
    setLoadingBooks(true)

    try {
      // ดึง orders ที่ตรงกับชั้นที่เลือกก่อน (ไม่ filter status ที่ query)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('grade', selectedGrade)

      console.log('All orders for grade', selectedGrade, ':', ordersData, ordersError)

      if (ordersError) {
        console.error('Orders error:', ordersError)
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      // Filter เอา draft ออกใน JavaScript
      const validOrders = (ordersData || []).filter(o => o.status !== 'draft')
      console.log('Valid orders (not draft):', validOrders)

      if (validOrders.length === 0) {
        console.log('No valid orders found for grade:', selectedGrade)
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      const orderIds = validOrders.map(o => o.id)

      // ดึง order_items สำหรับ orders เหล่านั้น พร้อม typeofbooks
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id, book_id, quantity, received_quantity, order_id,
          books(id, title, price, type_id, typeofbooks(id, name))
        `)
        .in('order_id', orderIds)

      console.log('Order items:', orderItemsData, itemsError)

      if (itemsError || !orderItemsData) {
        console.error('Error fetching order items:', itemsError)
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      // กรองตามกลุ่มสาระ (ถ้าเลือก)
      let filteredItems = orderItemsData
      if (selectedSubject) {
        filteredItems = orderItemsData.filter(item => item.books?.typeofbooks?.name === selectedSubject)
      }

      console.log('Filtered items:', filteredItems)

      // รวมจำนวนหนังสือที่เหมือนกัน (group by book_id)
      const bookMap = {}
      filteredItems.forEach(item => {
        const bookId = item.book_id
        if (!bookMap[bookId]) {
          bookMap[bookId] = {
            book_id: bookId,
            title: item.books?.title,
            subject_group: item.books?.typeofbooks?.name || '-',
            price: item.books?.price,
            total_ordered: 0,
            total_received: 0,
            order_item_ids: []
          }
        }
        bookMap[bookId].total_ordered += item.quantity || 0
        bookMap[bookId].total_received += item.received_quantity || 0
        bookMap[bookId].order_item_ids.push(item.id)
      })

      const books = Object.values(bookMap)
      console.log('Final books:', books)

      setFilteredBooks(books)
      setAllOrderItems(filteredItems)

      // ตั้งค่าเริ่มต้นเป็น 0
      const items = {}
      books.forEach(book => {
        items[book.book_id] = 0
      })
      setReceiveItems(items)

      // หาครั้งที่รับสำหรับชั้นนี้
      const gradeReceipts = receipts.filter(r => r.grade === selectedGrade)
      setDeliveryNumber(gradeReceipts.length + 1)
    } catch (err) {
      console.error('Error in fetchFilteredBooks:', err)
      setFilteredBooks([])
    }

    setLoadingBooks(false)
  }

  const openReceiveModal = () => {
    setSelectedGrade('')
    setSelectedSubject('')
    setReceiptDate(new Date().toISOString().slice(0, 10))
    setDeliveryNumber(1)
    setFilteredBooks([])
    setReceiveItems({})
    setNotes('')
    setShowReceiveModal(true)
  }

  const handleReceive = async () => {
    // ตรวจสอบว่ามีการใส่จำนวนอย่างน้อย 1 รายการ
    const hasItems = Object.values(receiveItems).some(qty => qty > 0)
    if (!hasItems) {
      Swal.fire({ icon: 'warning', title: 'กรุณาใส่จำนวนรับอย่างน้อย 1 รายการ' })
      return
    }

    if (!selectedGrade) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกชั้นเรียน' })
      return
    }

    setSaving(true)

    // สร้างเลขที่ใบรับ
    const receiptNumber = `REC-${receiptDate.replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

    // สร้างใบรับหนังสือ
    const { data: receiptData, error: receiptError } = await supabase
      .from('book_receipts')
      .insert({
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        delivery_number: deliveryNumber,
        grade: selectedGrade,
        subject_group: selectedSubject || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (receiptError) {
      Swal.fire({ icon: 'error', title: 'สร้างใบรับไม่สำเร็จ', text: receiptError.message })
      setSaving(false)
      return
    }

    // สร้างรายการในใบรับ
    const items = Object.entries(receiveItems)
      .filter(([_, qty]) => qty > 0)
      .map(([bookId, qty]) => ({
        receipt_id: receiptData.id,
        book_id: bookId,
        received_qty: qty,
      }))

    const { error: itemsError } = await supabase
      .from('book_receipt_items')
      .insert(items)

    if (itemsError) {
      Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: itemsError.message })
      setSaving(false)
      return
    }

    // อัพเดท received_quantity ใน order_items
    for (const [bookId, qty] of Object.entries(receiveItems)) {
      if (qty > 0) {
        const bookData = filteredBooks.find(b => b.book_id === bookId)
        if (bookData && bookData.order_item_ids.length > 0) {
          // กระจายจำนวนที่รับไปยัง order_items
          let remainingQty = qty
          for (const orderItemId of bookData.order_item_ids) {
            if (remainingQty <= 0) break

            const orderItem = allOrderItems.find(i => i.id === orderItemId)
            if (orderItem) {
              const canReceive = orderItem.quantity - (orderItem.received_quantity || 0)
              const toReceive = Math.min(remainingQty, canReceive)

              if (toReceive > 0) {
                const newTotal = (orderItem.received_quantity || 0) + toReceive
                await supabase
                  .from('order_items')
                  .update({ received_quantity: newTotal })
                  .eq('id', orderItemId)
                remainingQty -= toReceive
              }
            }
          }
        }
      }
    }

    Swal.fire({
      icon: 'success',
      title: 'บันทึกการรับหนังสือสำเร็จ',
      text: `เลขที่: ${receiptNumber} (ครั้งที่ ${deliveryNumber})`,
      confirmButtonColor: '#2563eb'
    })

    setShowReceiveModal(false)
    fetchData()
    setSaving(false)
  }

  const openDetailModal = (receipt) => {
    setSelectedReceipt(receipt)
    setShowDetailModal(true)
  }

  // สถิติ
  const totalReceipts = receipts.length
  const totalBooksReceived = receipts.reduce((sum, r) =>
    sum + (r.book_receipt_items?.reduce((s, i) => s + (i.received_qty || 0), 0) || 0), 0)

  const filtered = receipts.filter(r =>
    (r.receipt_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (gradeLabel[r.grade] || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.subject_group || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
          <h1 className="text-2xl font-bold">รับหนังสือจากสำนักพิมพ์</h1>
          <p className="text-gray-500 text-sm mt-1">บันทึกการรับหนังสือจากสำนักพิมพ์</p>
        </div>
        <button
          onClick={openReceiveModal}
          className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 flex items-center gap-2"
        >
          <Plus size={18} /> รับหนังสือ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <Package size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">ใบรับทั้งหมด</p>
            <p className="text-2xl font-bold">{totalReceipts}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50">
            <BookOpen size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">หนังสือที่รับแล้ว</p>
            <p className="text-2xl font-bold">{totalBooksReceived.toLocaleString()} เล่ม</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-50">
            <Calendar size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">รับล่าสุด</p>
            <p className="text-lg font-bold">
              {receipts[0] ? new Date(receipts[0].receipt_date).toLocaleDateString('th-TH') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold">ประวัติการรับหนังสือ</h3>
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">เลขที่ใบรับ</th>
                <th className="text-center px-4 py-3 font-medium">วันที่รับ</th>
                <th className="text-center px-4 py-3 font-medium">ชั้น</th>
                <th className="text-left px-4 py-3 font-medium">กลุ่มสาระ</th>
                <th className="text-center px-4 py-3 font-medium">ครั้งที่</th>
                <th className="text-center px-4 py-3 font-medium">จำนวนรายการ</th>
                <th className="text-center px-4 py-3 font-medium">รวมเล่ม</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map(receipt => {
                const itemCount = receipt.book_receipt_items?.length || 0
                const totalQty = receipt.book_receipt_items?.reduce((s, i) => s + (i.received_qty || 0), 0) || 0

                return (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{receipt.receipt_number}</td>
                    <td className="px-4 py-3 text-center">
                      {new Date(receipt.receipt_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {gradeLabel[receipt.grade] || receipt.grade || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{receipt.subject_group || 'ทุกกลุ่มสาระ'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        ครั้งที่ {receipt.delivery_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{itemCount}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-600">{totalQty}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetailModal(receipt)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
              แสดง {(currentPage - 1) * PAGE_SIZE + 1} ถึง {Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">รับหนังสือจากสำนักพิมพ์</h3>
              {selectedGrade && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  ครั้งที่ {deliveryNumber}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นเรียน <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedGrade}
                  onChange={e => setSelectedGrade(e.target.value)}
                >
                  <option value="">-- เลือกชั้น --</option>
                  {gradeOptions.map(g => (
                    <option key={g} value={g}>{gradeLabel[g]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                >
                  <option value="">ทุกกลุ่มสาระ</option>
                  {typeofbooks.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับ</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="หมายเหตุ (ถ้ามี)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Loading */}
            {loadingBooks && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-500">กำลังโหลดรายการหนังสือ...</span>
              </div>
            )}

            {/* Books Table */}
            {!loadingBooks && selectedGrade && filteredBooks.length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">รายการหนังสือ</th>
                      <th className="text-left px-3 py-2">กลุ่มสาระ</th>
                      <th className="text-center px-3 py-2 w-20">สั่ง</th>
                      <th className="text-center px-3 py-2 w-20">รับแล้ว</th>
                      <th className="text-center px-3 py-2 w-20">คงเหลือ</th>
                      <th className="text-center px-3 py-2 w-28">รับครั้งนี้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book, idx) => {
                      const remaining = book.total_ordered - book.total_received
                      return (
                        <tr key={book.book_id} className="border-b">
                          <td className="px-3 py-3">{idx + 1}</td>
                          <td className="px-3 py-3">{book.title}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{book.subject_group || '-'}</td>
                          <td className="px-3 py-3 text-center">{book.total_ordered}</td>
                          <td className="px-3 py-3 text-center text-green-600 font-medium">{book.total_received}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={remaining > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              className="w-20 text-center border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={receiveItems[book.book_id] || 0}
                              onChange={e => {
                                const val = Math.min(Math.max(0, Number(e.target.value)), remaining)
                                setReceiveItems(prev => ({ ...prev, [book.book_id]: val }))
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* No books found */}
            {!loadingBooks && selectedGrade && filteredBooks.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center mb-4">
                <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">ไม่พบรายการหนังสือสำหรับชั้นและกลุ่มสาระที่เลือก</p>
              </div>
            )}

            {/* Empty state */}
            {!loadingBooks && !selectedGrade && (
              <div className="bg-gray-50 rounded-lg p-8 text-center mb-4">
                <Package size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">กรุณาเลือกชั้นเรียนเพื่อแสดงรายการหนังสือ</p>
              </div>
            )}

            {/* Summary */}
            {selectedGrade && filteredBooks.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>รวมรับครั้งนี้:</strong> {Object.values(receiveItems).reduce((a, b) => a + b, 0)} เล่ม
                  จาก {filteredBooks.length} รายการ
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleReceive}
                disabled={saving || !selectedGrade}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                บันทึกการรับ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">รายละเอียดใบรับหนังสือ</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">เลขที่:</span> <span className="font-medium">{selectedReceipt.receipt_number}</span></p>
              <p><span className="text-gray-500">วันที่รับ:</span> <span className="font-medium">{new Date(selectedReceipt.receipt_date).toLocaleDateString('th-TH')}</span></p>
              <p><span className="text-gray-500">ชั้น:</span> <span className="font-medium">{gradeLabel[selectedReceipt.grade] || selectedReceipt.grade || '-'}</span></p>
              <p><span className="text-gray-500">ครั้งที่:</span> <span className="font-medium">{selectedReceipt.delivery_number}</span></p>
              <p className="col-span-2"><span className="text-gray-500">กลุ่มสาระ:</span> <span className="font-medium">{selectedReceipt.subject_group || 'ทุกกลุ่มสาระ'}</span></p>
              {selectedReceipt.notes && (
                <p className="col-span-2"><span className="text-gray-500">หมายเหตุ:</span> <span className="font-medium">{selectedReceipt.notes}</span></p>
              )}
            </div>

            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">รายการหนังสือ</th>
                  <th className="text-center px-4 py-2 w-24">จำนวนรับ</th>
                </tr>
              </thead>
              <tbody>
                {selectedReceipt.book_receipt_items?.map((item, idx) => (
                  <tr key={item.book_id} className="border-t">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">{item.books?.title}</td>
                    <td className="px-4 py-2 text-center font-medium text-green-600">{item.received_qty}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td colSpan={2} className="px-4 py-2 text-right font-medium">รวมทั้งสิ้น:</td>
                  <td className="px-4 py-2 text-center font-bold text-green-600">
                    {selectedReceipt.book_receipt_items?.reduce((s, i) => s + (i.received_qty || 0), 0)} เล่ม
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
