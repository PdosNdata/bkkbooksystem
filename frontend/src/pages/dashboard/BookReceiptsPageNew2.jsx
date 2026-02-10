import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Package, Loader2, Calendar, Truck, CheckCircle, Save, Eye, BookOpen, Edit, Trash2, ArrowRight } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']

const PAGE_SIZE = 10


export default function BookReceiptsPageNew2() {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState(null)
  const [editReceiveItems, setEditReceiveItems] = useState({})
  const [editNotes, setEditNotes] = useState('')
  const [editReceiptDate, setEditReceiptDate] = useState('')
  const [transferredItems, setTransferredItems] = useState({}) // เก็บสถานะการโอนของแต่ละรายการ
  const [selectedForTransfer, setSelectedForTransfer] = useState({}) // เก็บรายการที่เลือกจะโอน
  const [editingBooks, setEditingBooks] = useState([])
  const [subjectGroups, setSubjectGroups] = useState([])
  const [receipts, setReceipts] = useState([])
  const [allOrderItems, setAllOrderItems] = useState([])
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
  const inputRefs = useRef({})
  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  // ดึงจาก typeofbooks table
  useEffect(() => {
    fetchSubjectGroups()
  }, [])

  const fetchSubjectGroups = async () => {
    const { data, error } = await supabase
      .from('typeofbooks')
      .select('id, name, display_order')
      .order('display_order', { ascending: true, nullsFirst: false })  // ⬅️ ให้ null อยู่ท้าย
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading subject groups:', error)
      return
    }

    setSubjectGroups(data || [])
  }
  // 
  useEffect(() => { fetchData() }, [])

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
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('book_receipts')
      .select(`
        *,
        book_receipt_items(book_id, received_qty, books(title,  typeofbook_id))
      `)
      .order('receipt_date', { ascending: false })
    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError)
    }
    console.log('📋 Receipts data:', receiptsData)
    setReceipts(receiptsData || [])
    setLoading(false)
  }
  // ฟังก์ชั่นแก้ไข hdleUpdate
  const handleUpdate = async () => {
    if (!editingReceipt) return

    setSaving(true)

    try {
      // อัปเดตข้อมูลใบรับ
      const { error: updateError } = await supabase
        .from('book_receipts')
        .update({
          receipt_date: editReceiptDate,
          notes: editNotes || null,
        })
        .eq('id', editingReceipt.id)
        .select()

      if (updateError) {
        Swal.fire({ icon: 'error', title: 'แก้ไขไม่สำเร็จ', text: updateError.message })
        setSaving(false)
        return
      }

      // ลบรายการเดิมทั้งหมด
      const { error: deleteError } = await supabase
        .from('book_receipt_items')
        .delete()
        .eq('receipt_id', editingReceipt.id)

      if (deleteError) {
        Swal.fire({ icon: 'error', title: 'ลบรายการเดิมไม่สำเร็จ', text: deleteError.message })
        setSaving(false)
        return
      }

      // คำนวณการเปลี่ยนแปลงจำนวนรับ
      const oldItems = {}
      editingReceipt.book_receipt_items?.forEach(item => {
        oldItems[item.book_id] = item.received_qty || 0
      })

      // เพิ่มรายการใหม่
      const newItems = Object.entries(editReceiveItems)
        .filter(([_, qty]) => qty > 0)
        .map(([bookId, qty]) => ({
          receipt_id: editingReceipt.id,
          book_id: bookId,
          received_qty: qty,
        }))

      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('book_receipt_items')
          .insert(newItems)

        if (insertError) {
          Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: insertError.message })
          setSaving(false)
          return
        }
      }

      // อัปเดต received_quantity ใน order_items
      for (const [bookId, newQty] of Object.entries(editReceiveItems)) {
        const oldQty = oldItems[bookId] || 0
        const diff = newQty - oldQty

        if (diff !== 0) {
          const bookData = editingBooks.find(b => b.book_id === bookId)
          if (bookData && bookData.order_item_ids.length > 0) {
            let remainingDiff = diff

            for (const orderItemId of bookData.order_item_ids) {
              if (remainingDiff === 0) break

              const { data: orderItem } = await supabase
                .from('order_items')
                .select('received_quantity, quantity')
                .eq('id', orderItemId)
                .single()

              if (orderItem) {
                const newTotal = (orderItem.received_quantity || 0) + remainingDiff
                const clampedTotal = Math.max(0, Math.min(newTotal, orderItem.quantity))

                await supabase
                  .from('order_items')
                  .update({ received_quantity: clampedTotal })
                  .eq('id', orderItemId)

                remainingDiff -= (clampedTotal - (orderItem.received_quantity || 0))
              }
            }
          }
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'แก้ไขข้อมูลสำเร็จ',
        confirmButtonColor: '#2563eb'
      })

      setShowEditModal(false)
      await fetchData()
    } catch (err) {
      console.error('Error updating receipt:', err)
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message })
    }

    setSaving(false)
  }

  // ฟังก์ชั่นโอนไปสต๊อก
  const handleTransferToStock = async (receipt) => {
    // ตรวจสอบว่ามีรายการหนังสือหรือไม่
    if (!receipt.book_receipt_items || receipt.book_receipt_items.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบรายการหนังสือ',
        text: 'ใบรับนี้ไม่มีรายการหนังสือที่จะโอนไปสต๊อก'
      })
      return
    }

    // ขอให้ผู้ใช้ระบุปีการศึกษา
    const { value: academicYear } = await Swal.fire({
      title: 'ระบุปีการศึกษา',
      input: 'text',
      inputLabel: 'ปีการศึกษา (เช่น 2568)',
      inputPlaceholder: 'พ.ศ.',
      inputValue: new Date().getFullYear() + 543, // ค่าเริ่มต้นเป็นปีปัจจุบัน
      showCancelButton: true,
      confirmButtonText: 'ถัดไป',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณาระบุปีการศึกษา'
        }
        if (!/^\d{4}$/.test(value)) {
          return 'กรุณาระบุปี พ.ศ. 4 หลัก (เช่น 2568)'
        }
      }
    })

    if (!academicYear) return

    const result = await Swal.fire({
      title: 'ยืนยันการโอนไปสต๊อก?',
      html: `
        <div class="text-left">
          <p class="mb-2">โอนหนังสือจากใบรับ: <strong>${receipt.receipt_number}</strong></p>
          <p class="mb-2">ปีการศึกษา: <strong>${academicYear}</strong></p>
          <p class="mb-2">ชั้น: <strong>${gradeLabel[receipt.grade]}</strong></p>
          <p class="mb-2">กลุ่มสาระ: <strong>${receipt.subject_group || 'ทุกกลุ่มสาระ'}</strong></p>
          <p class="mb-2">จำนวนรายการ: <strong>${receipt.book_receipt_items.length} รายการ</strong></p>
          <p class="text-sm text-gray-600 mt-3">หนังสือจะถูกเพิ่มเข้าสต๊อกเพื่อให้ครูเบิกได้</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'โอนไปสต๊อก',
      cancelButtonText: 'ยกเลิก',
      width: '500px'
    })

    if (!result.isConfirmed) return

    try {
      // เตรียมข้อมูลสำหรับเพิ่มเข้า book_stock
      const stockItems = receipt.book_receipt_items.map(item => ({
        book_id: item.book_id,
        grade: receipt.grade,
        academic_year: academicYear,
        quantity: item.received_qty || 0,
        available_quantity: item.received_qty || 0,
        source: 'receipt',
        source_id: receipt.id,
        notes: `โอนจากใบรับ ${receipt.receipt_number} (ครั้งที่ ${receipt.delivery_number})`
      }))

      // ตรวจสอบว่ามีข้อมูลในสต๊อกอยู่แล้วหรือไม่
      for (const stockItem of stockItems) {
        const { data: existingStock } = await supabase
          .from('book_stock')
          .select('id, quantity, available_quantity')
          .eq('book_id', stockItem.book_id)
          .eq('grade', stockItem.grade)
          .eq('academic_year', stockItem.academic_year)
          .maybeSingle()

        if (existingStock) {
          // อัปเดตยอดเดิม
          await supabase
            .from('book_stock')
            .update({
              quantity: existingStock.quantity + stockItem.quantity,
              available_quantity: existingStock.available_quantity + stockItem.available_quantity
            })
            .eq('id', existingStock.id)
        } else {
          // เพิ่มรายการใหม่
          await supabase
            .from('book_stock')
            .insert(stockItem)
        }
      }

      // อัปเดตสถานะของใบรับว่าโอนไปสต๊อกแล้ว
      await supabase
        .from('book_receipts')
        .update({ transferred_to_stock: true })
        .eq('id', receipt.id)

      Swal.fire({
        icon: 'success',
        title: 'โอนไปสต๊อกสำเร็จ',
        html: `
          <p>โอนหนังสือจำนวน <strong>${receipt.book_receipt_items.reduce((sum, item) => sum + (item.received_qty || 0), 0)} เล่ม</strong></p>
          <p>เข้าปีการศึกษา <strong>${academicYear}</strong></p>
          <p class="text-sm text-gray-600 mt-2">ครูสามารถเบิกหนังสือได้แล้ว</p>
        `,
        confirmButtonColor: '#2563eb'
      })

      await fetchData()
    } catch (err) {
      console.error('Error transferring to stock:', err)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถโอนไปสต๊อกได้'
      })
    }
  }

  // ฟังก์ชั่นลบใบรับ
  const handleDelete = async (receipt) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      html: `
        <div class="text-left">
          <p>คุณต้องการลบใบรับหนังสือ</p>
          <p class="font-bold mt-2">${receipt.receipt_number}</p>
          <p class="mt-2">ครั้งที่ ${receipt.delivery_number} ของชั้น ${gradeLabel[receipt.grade]}</p>
          <p class="text-sm text-red-600 mt-3">⚠️ การลบจะทำให้จำนวนรับในคำสั่งซื้อลดลงด้วย</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      width: '500px'
    })
  
    if (!result.isConfirmed) return
  
    setSaving(true)
  
    try {
      console.log('🗑️ Deleting receipt:', receipt)
  
      // 1. ลด received_quantity ใน order_items ก่อน
      if (receipt.book_receipt_items && receipt.book_receipt_items.length > 0) {
        console.log('📦 Processing book receipt items:', receipt.book_receipt_items)
  
        // ดึงข้อมูล orders ของชั้นนี้
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id')
          .eq('grade', receipt.grade)
  
        if (ordersError) {
          throw new Error(`ไม่สามารถดึงข้อมูลคำสั่งซื้อ: ${ordersError.message}`)
        }
  
        console.log('📋 Orders found:', ordersData)
  
        if (ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map(o => o.id)
  
          // ดึงข้อมูล order_items
          const { data: orderItemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('id, book_id, received_quantity, quantity')
            .in('order_id', orderIds)
  
          if (itemsError) {
            throw new Error(`ไม่สามารถดึงข้อมูลรายการสั่งซื้อ: ${itemsError.message}`)
          }
  
          console.log('📚 Order items found:', orderItemsData)
  
          if (orderItemsData) {
            // ลด received_quantity ตามที่รับไว้
            for (const item of receipt.book_receipt_items) {
              const bookId = item.book_id
              const receivedQty = item.received_qty || 0
              
              console.log(`📖 Processing book ${bookId}, reducing by ${receivedQty}`)
  
              if (receivedQty <= 0) continue
  
              let remainingToDeduct = receivedQty
  
              // หา order_items ที่เกี่ยวข้องกับหนังสือเล่มนี้
              const relatedOrderItems = orderItemsData.filter(oi => oi.book_id === bookId)
              console.log(`  Found ${relatedOrderItems.length} related order items`)
  
              for (const orderItem of relatedOrderItems) {
                if (remainingToDeduct <= 0) break
  
                const currentReceived = orderItem.received_quantity || 0
                const toDeduct = Math.min(remainingToDeduct, currentReceived)
  
                if (toDeduct > 0) {
                  const newReceived = currentReceived - toDeduct
                  
                  console.log(`  Order item ${orderItem.id}: ${currentReceived} -> ${newReceived}`)
  
                  const { error: updateError } = await supabase
                    .from('order_items')
                    .update({ received_quantity: newReceived })
                    .eq('id', orderItem.id)
  
                  if (updateError) {
                    console.error('❌ Update error:', updateError)
                    throw new Error(`ไม่สามารถอัปเดตจำนวนรับ: ${updateError.message}`)
                  }
  
                  remainingToDeduct -= toDeduct
                }
              }
  
              if (remainingToDeduct > 0) {
                console.warn(`⚠️ Could not deduct ${remainingToDeduct} items for book ${bookId}`)
              }
            }
          }
        }
      }
  
      // 2. ลบรายการใน book_receipt_items
      console.log('🗑️ Deleting book_receipt_items')
      const { error: deleteItemsError } = await supabase
        .from('book_receipt_items')
        .delete()
        .eq('receipt_id', receipt.id)
  
      if (deleteItemsError) {
        throw new Error(`ไม่สามารถลบรายการหนังสือ: ${deleteItemsError.message}`)
      }
  
      // 3. ลบใบรับ
      console.log('🗑️ Deleting book_receipt')
      const { error: deleteReceiptError } = await supabase
        .from('book_receipts')
        .delete()
        .eq('id', receipt.id)
  
      if (deleteReceiptError) {
        throw new Error(`ไม่สามารถลบใบรับ: ${deleteReceiptError.message}`)
      }
  
      console.log('✅ Delete completed successfully')
  
      Swal.fire({
        icon: 'success',
        title: 'ลบสำเร็จ',
        html: `
          <p>ลบใบรับหนังสือเรียบร้อยแล้ว</p>
          <p class="text-sm text-gray-600 mt-2">จำนวนรับในคำสั่งซื้อได้ถูกปรับลดแล้ว</p>
        `,
        confirmButtonColor: '#2563eb'
      })
  
      await fetchData()
    } catch (err) {
      console.error('💥 Error deleting receipt:', err)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถลบใบรับได้'
      })
    }
  
    setSaving(false)
  }

  // ฟังก์ชั่นแก้ไข
  const openEditModal = async (receipt) => {
    console.log('🔧 Opening edit modal for receipt:', receipt)

    setEditingReceipt(receipt)
    setEditReceiptDate(receipt.receipt_date)
    setEditNotes(receipt.notes || '')

    // ดึงข้อมูลหนังสือที่รับไว้
    const items = {}
    receipt.book_receipt_items?.forEach(item => {
      items[item.book_id] = item.received_qty || 0
    })
    console.log('📝 Current items:', items)
    setEditReceiveItems(items)

    // ดึงข้อมูลหนังสือทั้งหมดของชั้นนี้
    try {
      console.log('🔍 Fetching books for grade:', receipt.grade)

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('grade', receipt.grade)

      console.log('📦 Orders data:', ordersData, ordersError)

      if (ordersError || !ordersData) {
        console.error('❌ Orders error:', ordersError)
        setEditingBooks([])
        setShowEditModal(true)
        return
      }

      // Filter out draft orders
      const validOrders = ordersData.filter(o => o.status && o.status !== 'draft')
      console.log('✅ Valid orders:', validOrders)

      if (validOrders.length === 0) {
        console.log('⚠️ No valid orders found')
        setEditingBooks([])
        setShowEditModal(true)
        return
      }

      const orderIds = validOrders.map(o => o.id)

      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          book_id,
          quantity,
          received_quantity,
          books (
            id,
            title,
            typeofbook_id
          )
        `)
        .in('order_id', orderIds)

      console.log('📚 Order items data:', orderItemsData, itemsError)

      if (itemsError || !orderItemsData || orderItemsData.length === 0) {
        console.error('❌ Items error:', itemsError)
        setEditingBooks([])
        setShowEditModal(true)
        return
      }

      // ดึงชื่อกลุ่มสาระ
      const typeofbookIds = [...new Set(orderItemsData.map(item => item.books?.typeofbook_id).filter(Boolean))]

      const { data: typeofsData } = await supabase
        .from('typeofbooks')
        .select('id, name')
        .in('id', typeofbookIds)

      console.log('📂 Typeofbooks data:', typeofsData)

      const typeofbookMap = {}
      typeofsData?.forEach(t => {
        typeofbookMap[t.id] = t.name
      })

      orderItemsData.forEach(item => {
        if (item.books) {
          item.books.typeofbook_name = typeofbookMap[item.books.typeofbook_id]
        }
      })

      // กรองตามกลุ่มสาระ (ถ้ามี)
      let filteredItems = orderItemsData
      if (receipt.subject_group && receipt.subject_group !== 'ทุกกลุ่มสาระ') {
        console.log('🎯 Filtering by subject_group:', receipt.subject_group)

        // หา ID ของกลุ่มสาระจากชื่อ
        const subjectId = subjectGroups.find(s => s.name === receipt.subject_group)?.id
        console.log('📌 Subject ID:', subjectId)

        if (subjectId) {
          filteredItems = orderItemsData.filter(item => item.books?.typeofbook_id === subjectId)
          console.log('✅ Filtered items:', filteredItems.length)
        }
      }

      // รวมข้อมูล
      const bookMap = {}
      filteredItems.forEach(item => {
        const bookId = item.book_id
        if (!bookMap[bookId]) {
          bookMap[bookId] = {
            book_id: bookId,
            title: item.books?.title,
            typeofbook_id: item.books?.typeofbook_id,
            typeofbook_name: item.books?.typeofbook_name,
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
      console.log('📖 Final books:', books)

      setEditingBooks(books)

      // เติมข้อมูลหนังสือที่ยังไม่มีในรายการรับ
      books.forEach(book => {
        if (!(book.book_id in items)) {
          items[book.book_id] = 0
        }
      })
      setEditReceiveItems({ ...items })

    } catch (err) {
      console.error('💥 Error loading books for edit:', err)
      setEditingBooks([])
    }

    setShowEditModal(true)
  }
  // 
  const fetchFilteredBooks = async () => {
    setLoadingBooks(true)

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('grade', selectedGrade)

      console.log('🔍 All orders for grade', selectedGrade, ':', ordersData)

      if (ordersError || !ordersData || ordersData.length === 0) {
        console.log('⚠️ No orders found')
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      const validOrders = ordersData.filter(o => o.status && o.status !== 'draft')

      if (validOrders.length === 0) {
        console.log('⚠️ No valid orders')
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      const orderIds = validOrders.map(o => o.id)

      // แก้ไขตรงนี้ - ไม่ดึง typeofbooks ใน nested query
      const { data: orderItemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          book_id,
          quantity,
          received_quantity,
          order_id,
          books (
            id,
            title,
            price,
            typeofbook_id
          )
        `)
        .in('order_id', orderIds)

      console.log('📚 Order items:', orderItemsData)

      if (itemsError || !orderItemsData || orderItemsData.length === 0) {
        console.error('❌ Error:', itemsError)
        setFilteredBooks([])
        setLoadingBooks(false)
        return
      }

      // ดึงชื่อกลุ่มสาระแยก
      const typeofbookIds = [...new Set(orderItemsData.map(item => item.books?.typeofbook_id).filter(Boolean))]

      const { data: typeofsData } = await supabase
        .from('typeofbooks')
        .select('id, name')
        .in('id', typeofbookIds).order('display_order')

      const typeofbookMap = {}
      typeofsData?.forEach(t => {
        typeofbookMap[t.id] = t.name
      })

      // เติมชื่อเข้าไป
      orderItemsData.forEach(item => {
        if (item.books) {
          item.books.typeofbook_name = typeofbookMap[item.books.typeofbook_id]
        }
      })

      // กรองตามกลุ่มสาระ
      let filteredItems = orderItemsData
      if (selectedSubject && selectedSubject !== '') {
        filteredItems = orderItemsData.filter(item => {
          return item.books?.typeofbook_id === selectedSubject  // เปรียบเทียบ UUID string ตรงๆ
        })
        console.log(`📊 Filtered by subject: ${filteredItems.length} items`)
      }

      // if (filteredItems.length === 0) {
      //   console.log('⚠️ No items after filter')
      //   setFilteredBooks([])
      //   setLoadingBooks(false)
      //   return
      // }

      // รวมจำนวน
      const bookMap = {}
      filteredItems.forEach(item => {
        const bookId = item.book_id
        if (!bookMap[bookId]) {
          bookMap[bookId] = {
            book_id: bookId,
            title: item.books?.title,
            typeofbook_id: item.books?.typeofbook_id,
            typeofbook_name: item.books?.typeofbook_name,
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
      console.log('📖 Final books:', books)

      setFilteredBooks(books)
      setAllOrderItems(filteredItems)

      const items = {}
      books.forEach(book => {
        items[book.book_id] = 0
      })
      setReceiveItems(items)

      const gradeReceipts = receipts.filter(r => r.grade === selectedGrade)
      setDeliveryNumber(gradeReceipts.length + 1)
    } catch (err) {
      console.error('💥 Error:', err)
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

    // แปลง idเป็นชื่อ
    const subjectName = subjectGroups.find(s => s.id === selectedSubject)?.name || null
    // สร้างใบรับหนังสือ
    const { data: receiptData, error: receiptError } = await supabase
      .from('book_receipts')
      .insert({
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        delivery_number: deliveryNumber,
        grade: selectedGrade,
       
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
                        ครั้งที่ {receipt.delivery_number || '-'}
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
                      <button
                        onClick={() => handleTransferToStock(receipt)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg ml-1"
                        title="โอนไปสต๊อก"
                        disabled={receipt.transferred_to_stock}
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(receipt)}
                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg ml-1"
                        title="แก้ไข"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(receipt)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg ml-1"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการรับหนังสือ'}
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
                  onChange={e => {
                    console.log('📝 Selected subject changed to:', e.target.value, typeof e.target.value)
                    setSelectedSubject(e.target.value)
                  }}
                >
                  <option value="">ทุกกลุ่มสาระ</option>
                  {subjectGroups.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
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
                          <td className="px-3 py-3 text-xs text-gray-500">{book.typeofbook_name || '-'}</td>
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
                              ref={el => inputRefs.current[book.book_id] = el}
                              className="w-20 text-center border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={receiveItems[book.book_id] || 0}
                              onChange={e => {
                                const val = Math.min(Math.max(0, Number(e.target.value)), remaining)
                                setReceiveItems(prev => ({ ...prev, [book.book_id]: val }))
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const currentIdx = filteredBooks.findIndex(b => b.book_id === book.book_id)
                                  if (currentIdx >= 0 && currentIdx < filteredBooks.length - 1) {
                                    const nextBook = filteredBooks[currentIdx + 1]
                                    const nextInput = inputRefs.current[nextBook.book_id]
                                    if (nextInput) {
                                      nextInput.focus()
                                      nextInput.select()
                                    }
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  // ไปบรรทัดก่อนหน้า
                                  if (currentIdx > 0) {
                                    const prevBook = filteredBooks[currentIdx - 1]
                                    const prevInput = inputRefs.current[prevBook.book_id]
                                    if (prevInput) {
                                      prevInput.focus()
                                      prevInput.select()
                                    }
                                  }
                                }
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
              <p><span className="text-gray-500">เลขที่:</span> <span className="font-medium">{selectedReceipt.receipt_number || '-'}</span></p>
              <p><span className="text-gray-500">วันที่รับ:</span> <span className="font-medium">{selectedReceipt.receipt_date ? new Date(selectedReceipt.receipt_date).toLocaleDateString('th-TH') : '-'}</span></p>
              <p><span className="text-gray-500">ชั้น:</span> <span className="font-medium">{gradeLabel[selectedReceipt.grade] || selectedReceipt.grade || '-'}</span></p>
              <p><span className="text-gray-500">ครั้งที่:</span> <span className="font-medium">{selectedReceipt.delivery_number || '-'}</span></p>
              <p className="col-span-2"><span className="text-gray-500">กลุ่มสาระ:</span> <span className="font-medium">{selectedReceipt.subject_group || 'ทุกกลุ่มสาระ'}</span></p>
              {selectedReceipt.notes && (
                <p className="col-span-2"><span className="text-gray-500">หมายเหตุ:</span> <span className="font-medium">{selectedReceipt.notes}</span></p>
              )}
            </div>

            {selectedReceipt.book_receipt_items && selectedReceipt.book_receipt_items.length > 0 ? (
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">รายการหนังสือ</th>
                    <th className="text-center px-4 py-2 w-24">จำนวนรับ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceipt.book_receipt_items.map((item, idx) => (
                    <tr key={item.book_id || idx} className="border-t">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{item.books?.title || '-'}</td>
                      <td className="px-4 py-2 text-center font-medium text-green-600">{item.received_qty || 0}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t">
                    <td colSpan={2} className="px-4 py-2 text-right font-medium">รวมทั้งสิ้น:</td>
                    <td className="px-4 py-2 text-center font-bold text-green-600">
                      {selectedReceipt.book_receipt_items.reduce((s, i) => s + (i.received_qty || 0), 0)} เล่ม
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">ไม่มีรายการหนังสือ</p>
              </div>
            )}

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
      {/* Edit Modal */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">แก้ไขการรับหนังสือ</h3>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {editingReceipt.receipt_number}
              </span>
            </div>

            {/* ข้อมูลพื้นฐาน */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นเรียน</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                  value={gradeLabel[editingReceipt.grade] || editingReceipt.grade}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ครั้งที่</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                  value={`ครั้งที่ ${editingReceipt.delivery_number}`}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มสาระ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
                  value={editingReceipt.subject_group || 'ทุกกลุ่มสาระ'}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับ</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={editReceiptDate}
                  onChange={e => setEditReceiptDate(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="หมายเหตุ (ถ้ามี)"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ตารางหนังสือ */}
            {editingBooks && editingBooks.length > 0 ? (
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
                      <th className="text-center px-3 py-2 w-28">แก้ไขจำนวนรับ<br/><span className="text-xs font-normal text-gray-500">(ครั้งนี้)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingBooks.map((book, idx) => {
                      const remaining = book.total_ordered - book.total_received
                      const currentQty = editReceiveItems[book.book_id] || 0
                      return (
                        <tr key={book.book_id} className="border-b">
                          <td className="px-3 py-3">{idx + 1}</td>
                          <td className="px-3 py-3">{book.title}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{book.typeofbook_name || '-'}</td>
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
                              className="w-20 text-center border rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                              value={currentQty}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value))
                                setEditReceiveItems(prev => ({ ...prev, [book.book_id]: val }))
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const currentRow = e.target.closest('tr')
                                  const nextRow = currentRow?.nextElementSibling
                                  const nextInput = nextRow?.querySelector('input[type="number"]')
                                  if (nextInput) {
                                    nextInput.focus()
                                    nextInput.select()
                                  }
                                }
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center mb-4">
                <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">กำลังโหลดรายการหนังสือ...</p>
              </div>
            )}

            {/* Summary */}
            <div className="bg-orange-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-700">
                <strong>รวมรับทั้งหมด:</strong> {Object.values(editReceiveItems).reduce((a, b) => a + b, 0)} เล่ม
                จาก {editingBooks.length} รายการ
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
