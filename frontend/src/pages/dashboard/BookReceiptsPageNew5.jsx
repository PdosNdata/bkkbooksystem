import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Package, Loader2, Calendar, Save, Eye, BookOpen, Edit, Trash2, CheckSquare, Square } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']

const PAGE_SIZE = 10

export default function BookReceiptsPageNew5() {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState(null)
  const [editReceiveItems, setEditReceiveItems] = useState({})
  const [editNotes, setEditNotes] = useState('')
  const [editReceiptDate, setEditReceiptDate] = useState('')
  const [editingBooks, setEditingBooks] = useState([])
  const [transferredItems, setTransferredItems] = useState({}) // เก็บสถานะการโอนของแต่ละรายการ
  const [selectedForTransfer, setSelectedForTransfer] = useState({}) // เก็บรายการที่เลือกจะโอน
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
  const [noDataReason, setNoDataReason] = useState('') // สาเหตุที่ไม่พบข้อมูล
  const inputRefs = useRef({})
  
  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    fetchSubjectGroups()
  }, [])

  const fetchSubjectGroups = async () => {
    const { data, error } = await supabase
      .from('typeofbooks')
      .select('id, name, display_order')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading subject groups:', error)
      return
    }

    setSubjectGroups(data || [])
  }

  useEffect(() => { fetchData() }, [])

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

    const { data: receiptsData, error: receiptsError } = await supabase
      .from('book_receipts')
      .select(`
        *,
        book_receipt_items(
          id,
          book_id, 
          received_qty, 
          transferred_to_stock,
          books(id, title, typeofbook_id)
        )
      `)
      .order('receipt_date', { ascending: false })
      
    if (receiptsError) {
      console.error('Error fetching receipts:', receiptsError)
    }
    
    console.log('📋 Receipts data:', receiptsData)
    setReceipts(receiptsData || [])
    setLoading(false)
  }

  // ฟังก์ชันสร้างเลขที่เอกสารจาก document_types และ document_sequences
// ฟังก์ชันสร้างเลขที่เอกสารจาก document_types และ document_sequences
const generateReceiptNumber = async () => {
  try {
    // 1. ดึงข้อมูล document_type สำหรับใบรับ (code = 'R')
    const { data: docType, error: docTypeError } = await supabase
      .from('document_types')
      .select('code, prefix')
      .eq('code', 'R')
      .single()

    if (docTypeError || !docType) {
      console.error('❌ ไม่พบ document_type สำหรับใบรับ:', docTypeError)
      // Fallback
      const currentYear = new Date().getFullYear()
      const buddhistYear = currentYear + 543
      return `ร${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}/${buddhistYear}`
    }

    console.log('✅ Document type:', docType)

    // 2. ดึง sequence ล่าสุดของประเภท R (เรียงตาม year มากที่สุด)
    const { data: latestSequence, error: seqError } = await supabase
      .from('document_sequences')
      .select('*')
      .eq('document_type_code', docType.code)
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle()

    let fiscalYear
    let nextNumber = 1
    let sequenceId = null

    if (latestSequence) {
      // มี sequence อยู่แล้ว ใช้ปีจาก sequence นั้น
      fiscalYear = latestSequence.year
      nextNumber = latestSequence.last_number + 1
      sequenceId = latestSequence.id

      console.log(`✅ ใช้ sequence ปี ${fiscalYear} เลขลำดับ: ${latestSequence.last_number} -> ${nextNumber}`)

      // อัปเดตเลขลำดับ
      const { error: updateError } = await supabase
        .from('document_sequences')
        .update({ 
          last_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)

      if (updateError) {
        console.error('❌ Error updating sequence:', updateError)
        throw updateError
      }
    } else {
      // ยังไม่มี sequence เลย สร้างใหม่ด้วยปีปัจจุบัน
      const currentYear = new Date().getFullYear()
      fiscalYear = currentYear + 543

      console.log(`🆕 สร้าง sequence ใหม่สำหรับปี ${fiscalYear}`)

      const { error: insertError } = await supabase
        .from('document_sequences')
        .insert({
          document_type_code: docType.code,
          year: fiscalYear,
          last_number: nextNumber
        })

      if (insertError) {
        console.error('❌ Error creating sequence:', insertError)
        throw insertError
      }
    }

    // 3. สร้างเลขที่เอกสาร: ร001/2568
    const receiptNumber = `${docType.prefix}${nextNumber.toString().padStart(3, '0')}/${fiscalYear}`
    
    console.log('✅ เลขที่ใบรับ:', receiptNumber)
    return receiptNumber

  } catch (err) {
    console.error('💥 Error generating receipt number:', err)
    // Fallback
    const currentYear = new Date().getFullYear()
    const buddhistYear = currentYear + 543
    const fallbackNumber = `ร${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}/${buddhistYear}`
    console.log('🚨 ใช้เลขฉุกเฉิน:', fallbackNumber)
    return fallbackNumber
  }
}
  // ฟังก์ชันโอนรายการที่เลือกไปสต๊อก
  const handleTransferSelectedToStock = async () => {
    const selectedBookIds = Object.keys(selectedForTransfer).filter(id => selectedForTransfer[id])
    
    if (selectedBookIds.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกรายการ',
        text: 'กรุณาเลือกรายการหนังสือที่ต้องการโอนไปสต๊อก'
      })
      return
    }

    // ขอให้ผู้ใช้ระบุปีการศึกษา
    const { value: academicYear } = await Swal.fire({
      title: 'ระบุปีการศึกษา',
      input: 'text',
      inputLabel: 'ปีการศึกษา (เช่น 2568)',
      inputPlaceholder: 'พ.ศ.',
      inputValue: new Date().getFullYear() + 543,
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

    // หารายการที่เลือก
    const selectedItems = editingReceipt.book_receipt_items.filter(item => 
      selectedForTransfer[item.id]
    )

    const result = await Swal.fire({
      title: 'ยืนยันการโอนไปสต๊อก?',
      html: `
        <div class="text-left">
          <p class="mb-2">โอนหนังสือจากใบรับ: <strong>${editingReceipt.receipt_number}</strong></p>
          <p class="mb-2">ปีการศึกษา: <strong>${academicYear}</strong></p>
          <p class="mb-2">ชั้น: <strong>${gradeLabel[editingReceipt.grade]}</strong></p>
          <p class="mb-2">จำนวนรายการที่เลือก: <strong>${selectedItems.length} รายการ</strong></p>
          <p class="mb-2">รวม: <strong>${selectedItems.reduce((sum, item) => sum + (item.received_qty || 0), 0)} เล่ม</strong></p>
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
      setSaving(true)

      for (const item of selectedItems) {
        // เตรียมข้อมูลสำหรับเพิ่มเข้า book_stock
        const stockItem = {
          book_id: item.book_id,
          grade: editingReceipt.grade,
          academic_year: academicYear,
          quantity: item.received_qty || 0,
          available_quantity: item.received_qty || 0,
          source: 'receipt',
          source_id: editingReceipt.id,
          notes: `โอนจากใบรับ ${editingReceipt.receipt_number} (ครั้งที่ ${editingReceipt.delivery_number})`
        }

        // ตรวจสอบว่ามีข้อมูลในสต๊อกอยู่แล้วหรือไม่
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

        // อัปเดตสถานะรายการว่าโอนแล้ว
        await supabase
          .from('book_receipt_items')
          .update({ transferred_to_stock: true })
          .eq('id', item.id)
      }

      // ตรวจสอบว่าทุกรายการโอนหมดแล้วหรือยัง
      const { data: remainingItems } = await supabase
        .from('book_receipt_items')
        .select('id')
        .eq('receipt_id', editingReceipt.id)
        .eq('transferred_to_stock', false)

      // ถ้าโอนหมดแล้ว อัปเดตสถานะใบรับ
      if (!remainingItems || remainingItems.length === 0) {
        await supabase
          .from('book_receipts')
          .update({ status: 'transferred' })
          .eq('id', editingReceipt.id)
      } else {
        await supabase
          .from('book_receipts')
          .update({ status: 'partial' })
          .eq('id', editingReceipt.id)
      }

      Swal.fire({
        icon: 'success',
        title: 'โอนไปสต๊อกสำเร็จ',
        html: `
          <p>โอนหนังสือจำนวน <strong>${selectedItems.reduce((sum, item) => sum + (item.received_qty || 0), 0)} เล่ม</strong></p>
          <p>เข้าปีการศึกษา <strong>${academicYear}</strong></p>
          <p class="text-sm text-gray-600 mt-2">ครูสามารถเบิกหนังสือได้แล้ว</p>
        `,
        confirmButtonColor: '#2563eb'
      })

      setShowEditModal(false)
      await fetchData()
    } catch (err) {
      console.error('Error transferring to stock:', err)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถโอนไปสต๊อกได้'
      })
    }

    setSaving(false)
  }

  // ฟังก์ชันแก้ไข - ตรวจสอบสถานะก่อน
  const handleUpdate = async () => {
    if (!editingReceipt) return

    // ตรวจสอบว่ามีรายการที่ยังไม่โอนหรือไม่
    const notTransferredItems = editingReceipt.book_receipt_items?.filter(
      item => !item.transferred_to_stock
    ) || []

    if (notTransferredItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถแก้ไขได้',
        text: 'รายการทั้งหมดโอนไปสต๊อกแล้ว'
      })
      return
    }

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

      // ลบเฉพาะรายการที่ยังไม่โอน
      const notTransferredItemIds = notTransferredItems.map(item => item.id)
      
      const { error: deleteError } = await supabase
        .from('book_receipt_items')
        .delete()
        .in('id', notTransferredItemIds)

      if (deleteError) {
        Swal.fire({ icon: 'error', title: 'ลบรายการเดิมไม่สำเร็จ', text: deleteError.message })
        setSaving(false)
        return
      }

      // คำนวณการเปลี่ยนแปลงจำนวนรับ
      const oldItems = {}
      notTransferredItems.forEach(item => {
        oldItems[item.book_id] = item.received_qty || 0
      })

      // เพิ่มรายการใหม่ (เฉพาะที่ยังไม่โอน)
      const newItems = Object.entries(editReceiveItems)
        .filter(([bookId, qty]) => {
          // ตรวจสอบว่ารายการนี้โอนแล้วหรือยัง
          const originalItem = editingReceipt.book_receipt_items?.find(
            item => item.book_id === bookId
          )
          return qty > 0 && (!originalItem || !originalItem.transferred_to_stock)
        })
        .map(([bookId, qty]) => ({
          receipt_id: editingReceipt.id,
          book_id: bookId,
          received_qty: qty,
          transferred_to_stock: false
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

      // อัปเดต received_quantity ใน order_items (เฉพาะรายการที่ไม่โอน)
      for (const [bookId, newQty] of Object.entries(editReceiveItems)) {
        // ข้าม รายการที่โอนแล้ว
        const originalItem = editingReceipt.book_receipt_items?.find(
          item => item.book_id === bookId
        )
        if (originalItem && originalItem.transferred_to_stock) continue

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

  // ฟังก์ชันลบ - ตรวจสอบสถานะก่อน
  const handleDelete = async (receipt) => {
    // ตรวจสอบว่ามีรายการที่โอนแล้วหรือไม่
    const hasTransferredItems = receipt.book_receipt_items?.some(
      item => item.transferred_to_stock
    )

    if (hasTransferredItems) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบได้',
        text: 'ใบรับนี้มีรายการที่โอนไปสต๊อกแล้ว ไม่สามารถลบได้'
      })
      return
    }

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

      // ลด received_quantity ใน order_items
      if (receipt.book_receipt_items && receipt.book_receipt_items.length > 0) {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id')
          .eq('grade', receipt.grade)

        if (ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map(o => o.id)

          const { data: orderItemsData } = await supabase
            .from('order_items')
            .select('id, book_id, received_quantity, quantity')
            .in('order_id', orderIds)

          if (orderItemsData) {
            for (const item of receipt.book_receipt_items) {
              const bookId = item.book_id
              const receivedQty = item.received_qty || 0

              if (receivedQty <= 0) continue

              let remainingToDeduct = receivedQty
              const relatedOrderItems = orderItemsData.filter(oi => oi.book_id === bookId)

              for (const orderItem of relatedOrderItems) {
                if (remainingToDeduct <= 0) break

                const currentReceived = orderItem.received_quantity || 0
                const toDeduct = Math.min(remainingToDeduct, currentReceived)

                if (toDeduct > 0) {
                  const newReceived = currentReceived - toDeduct

                  await supabase
                    .from('order_items')
                    .update({ received_quantity: newReceived })
                    .eq('id', orderItem.id)

                  remainingToDeduct -= toDeduct
                }
              }
            }
          }
        }
      }

      // ลบรายการใน book_receipt_items
      await supabase
        .from('book_receipt_items')
        .delete()
        .eq('receipt_id', receipt.id)

      // ลบใบรับ
      await supabase
        .from('book_receipts')
        .delete()
        .eq('id', receipt.id)

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

  const openEditModal = async (receipt) => {
    console.log('🔧 Opening edit modal for receipt:', receipt)

    setEditingReceipt(receipt)
    setEditReceiptDate(receipt.receipt_date)
    setEditNotes(receipt.notes || '')

    // ดึงข้อมูลสถานะการโอนของแต่ละรายการ
    const transferred = {}
    const items = {}
    const selected = {}
    
    receipt.book_receipt_items?.forEach(item => {
      items[item.book_id] = item.received_qty || 0
      transferred[item.book_id] = item.transferred_to_stock || false
      selected[item.id] = false // เริ่มต้นไม่เลือกรายการใดๆ
    })
    
    setEditReceiveItems(items)
    setTransferredItems(transferred)
    setSelectedForTransfer(selected)

    // ดึงข้อมูลหนังสือทั้งหมด
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, status')
        .eq('grade', receipt.grade)

      if (ordersData) {
        const validOrders = ordersData.filter(o => o.status && o.status !== 'draft')
        
        if (validOrders.length > 0) {
          const orderIds = validOrders.map(o => o.id)

          const { data: orderItemsData } = await supabase
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

          if (orderItemsData && orderItemsData.length > 0) {
            const typeofbookIds = [...new Set(orderItemsData.map(item => item.books?.typeofbook_id).filter(Boolean))]

            const { data: typeofsData } = await supabase
              .from('typeofbooks')
              .select('id, name')
              .in('id', typeofbookIds)

            const typeofbookMap = {}
            typeofsData?.forEach(t => {
              typeofbookMap[t.id] = t.name
            })

            orderItemsData.forEach(item => {
              if (item.books) {
                item.books.typeofbook_name = typeofbookMap[item.books.typeofbook_id]
              }
            })

            let filteredItems = orderItemsData
            if (receipt.subject_group && receipt.subject_group !== 'ทุกกลุ่มสาระ') {
              const subjectId = subjectGroups.find(s => s.name === receipt.subject_group)?.id
              if (subjectId) {
                filteredItems = orderItemsData.filter(item => item.books?.typeofbook_id === subjectId)
              }
            }

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
            setEditingBooks(books)

            books.forEach(book => {
              if (!(book.book_id in items)) {
                items[book.book_id] = 0
              }
            })
            setEditReceiveItems({ ...items })
          }
        }
      }
    } catch (err) {
      console.error('💥 Error loading books for edit:', err)
      setEditingBooks([])
    }

    setShowEditModal(true)
  }

  const fetchFilteredBooks = async () => {
    setLoadingBooks(true)
    setNoDataReason('')

    try {
      console.log('🔍 fetchFilteredBooks - selectedGrade:', selectedGrade)

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, grade')
        .eq('grade', selectedGrade)

      console.log('📦 Orders query result:', { ordersData, ordersError, count: ordersData?.length })

      if (ordersData && ordersData.length > 0) {
        const validOrders = ordersData.filter(o => o.status && o.status !== 'draft')
        console.log('✅ Valid orders (status != draft):', validOrders)

        if (validOrders.length > 0) {
          const orderIds = validOrders.map(o => o.id)
          console.log('📋 Order IDs to fetch items:', orderIds)

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

          console.log('📚 Order items result:', { orderItemsData, itemsError, count: orderItemsData?.length })

          if (orderItemsData && orderItemsData.length > 0) {
            const typeofbookIds = [...new Set(orderItemsData.map(item => item.books?.typeofbook_id).filter(Boolean))]

            const { data: typeofsData } = await supabase
              .from('typeofbooks')
              .select('id, name')
              .in('id', typeofbookIds)
              .order('display_order')

            const typeofbookMap = {}
            typeofsData?.forEach(t => {
              typeofbookMap[t.id] = t.name
            })

            orderItemsData.forEach(item => {
              if (item.books) {
                item.books.typeofbook_name = typeofbookMap[item.books.typeofbook_id]
              }
            })

            let filteredItems = orderItemsData
            if (selectedSubject && selectedSubject !== '') {
              filteredItems = orderItemsData.filter(item => {
                return item.books?.typeofbook_id === selectedSubject
              })
            }

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
            setFilteredBooks(books)
            setAllOrderItems(filteredItems)

            const items = {}
            books.forEach(book => {
              items[book.book_id] = 0
            })
            setReceiveItems(items)

            const gradeReceipts = receipts.filter(r => r.grade === selectedGrade)
            setDeliveryNumber(gradeReceipts.length + 1)
          } else {
            console.log('⚠️ No order items found for these orders')
            setNoDataReason(`คำสั่งซื้อสำหรับชั้น ${gradeLabel[selectedGrade]} ยังไม่มีรายการหนังสือ`)
            setFilteredBooks([])
          }
        } else {
          console.log('⚠️ No valid orders found (all orders may be drafts or none exist)')
          setNoDataReason(`ยังไม่มีคำสั่งซื้อที่อนุมัติแล้วสำหรับชั้น ${gradeLabel[selectedGrade]}\n(ต้องสร้างคำสั่งซื้อและอนุมัติก่อนจึงจะรับหนังสือได้)`)
          setFilteredBooks([])
        }
      } else {
        console.log('⚠️ No orders found for grade:', selectedGrade)
        setNoDataReason(`ยังไม่มีคำสั่งซื้อสำหรับชั้น ${gradeLabel[selectedGrade]}\n(ต้องสร้างคำสั่งซื้อก่อนจึงจะรับหนังสือได้)`)
        setFilteredBooks([])
      }
    } catch (err) {
      console.error('💥 Error:', err)
      setNoDataReason('เกิดข้อผิดพลาดในการดึงข้อมูล')
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
    setNoDataReason('')
    setShowReceiveModal(true)
  }

  const handleReceive = async () => {
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

    try {
      // สร้างเลขที่ใบรับจากระบบ document_types
      const receiptNumber = await generateReceiptNumber()
      const subjectName = subjectGroups.find(s => s.id === selectedSubject)?.name || null

      console.log('📝 Creating receipt with number:', receiptNumber)

      const { data: receiptData, error: receiptError } = await supabase
        .from('book_receipts')
        .insert({
          receipt_number: receiptNumber,
          receipt_date: receiptDate,
          delivery_number: deliveryNumber,
          grade: selectedGrade,
          subject_group: subjectName || null,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single()

      if (receiptError) {
        Swal.fire({ icon: 'error', title: 'สร้างใบรับไม่สำเร็จ', text: receiptError.message })
        setSaving(false)
        return
      }

      console.log('✅ Receipt created:', receiptData)

      const items = Object.entries(receiveItems)
        .filter(([_, qty]) => qty > 0)
        .map(([bookId, qty]) => ({
          receipt_id: receiptData.id,
          book_id: bookId,
          received_qty: qty,
          transferred_to_stock: false
        }))

      const { error: itemsError } = await supabase
        .from('book_receipt_items')
        .insert(items)

      if (itemsError) {
        Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: itemsError.message })
        setSaving(false)
        return
      }

      console.log('✅ Receipt items created')

      // อัปเดต received_quantity ใน order_items
      for (const [bookId, qty] of Object.entries(receiveItems)) {
        if (qty > 0) {
          const bookData = filteredBooks.find(b => b.book_id === bookId)
          if (bookData && bookData.order_item_ids.length > 0) {
            let remainingQty = qty
            for (const orderItemId of bookData.order_item_ids) {
              if (remainingQty <= 0) break

              const orderItem = allOrderItems.find(i => i.id === orderItemId)
              if (orderItem) {
                const canReceive = orderItem.quantity - (orderItem.received_quantity || 0)
                const toReceive = Math.min(remainingQty, canReceive)

                if (toReceive > 0) {
                  const newTotal = (orderItem.received_quantity || 0) + toReceive
                  
                  console.log(`📦 Updating order_item ${orderItemId}: ${orderItem.received_quantity || 0} -> ${newTotal}`)
                  
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

      console.log('✅ Order items updated with received quantities')

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการรับหนังสือสำเร็จ',
        text: `เลขที่: ${receiptNumber} (ครั้งที่ ${deliveryNumber})`,
        confirmButtonColor: '#2563eb'
      })

      setShowReceiveModal(false)
      fetchData()
    } catch (err) {
      console.error('💥 Error in handleReceive:', err)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ไม่สามารถบันทึกการรับหนังสือได้'
      })
    }

    setSaving(false)
  }

  const openDetailModal = (receipt) => {
    setSelectedReceipt(receipt)
    setShowDetailModal(true)
  }

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
        <span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">รับหนังสือจากสำนักพิมพ์</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">บันทึกการรับหนังสือจากสำนักพิมพ์</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <Package size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">ใบรับทั้งหมด</p>
            <p className="text-2xl font-bold dark:text-white">{totalReceipts}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30">
            <BookOpen size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">หนังสือที่รับแล้ว</p>
            <p className="text-2xl font-bold dark:text-white">{totalBooksReceived.toLocaleString()} เล่ม</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/30">
            <Calendar size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">รับล่าสุด</p>
            <p className="text-lg font-bold dark:text-white">
              {receipts[0] ? new Date(receipts[0].receipt_date).toLocaleDateString('th-TH') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold dark:text-white">ประวัติการรับหนังสือ</h3>
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <th className="text-left px-4 py-3 font-medium">เลขที่ใบรับ</th>
                <th className="text-center px-4 py-3 font-medium">วันที่รับ</th>
                <th className="text-center px-4 py-3 font-medium">ชั้น</th>
                <th className="text-left px-4 py-3 font-medium">กลุ่มสาระ</th>
                <th className="text-center px-4 py-3 font-medium">ครั้งที่</th>
                <th className="text-center px-4 py-3 font-medium">จำนวนรายการ</th>
                <th className="text-center px-4 py-3 font-medium">รวมเล่ม</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.map(receipt => {
                const itemCount = receipt.book_receipt_items?.length || 0
                const totalQty = receipt.book_receipt_items?.reduce((s, i) => s + (i.received_qty || 0), 0) || 0
                const transferredCount = receipt.book_receipt_items?.filter(i => i.transferred_to_stock).length || 0
                const hasTransferred = transferredCount > 0
                const allTransferred = transferredCount === itemCount && itemCount > 0

                return (
                  <tr key={receipt.id} className={allTransferred ? 'bg-green-50/30 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                    <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{receipt.receipt_number}</td>
                    <td className="px-4 py-3 text-center dark:text-gray-300">
                      {new Date(receipt.receipt_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {gradeLabel[receipt.grade] || receipt.grade || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-gray-300">{receipt.subject_group || 'ทุกกลุ่มสาระ'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        ครั้งที่ {receipt.delivery_number || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center dark:text-gray-300">{itemCount}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">{totalQty}</td>
                    <td className="px-4 py-3 text-center">
                      {allTransferred ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          โอนครบแล้ว
                        </span>
                      ) : hasTransferred ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          โอนบางส่วน ({transferredCount}/{itemCount})
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                          รอโอน
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetailModal(receipt)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(receipt)}
                          className={`p-1.5 rounded-lg ${
                            allTransferred
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                          }`}
                          title={allTransferred ? 'โอนครบแล้ว ไม่สามารถแก้ไขได้' : 'แก้ไข/โอนไปสต๊อก'}
                          disabled={allTransferred}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(receipt)}
                          className={`p-1.5 rounded-lg ${
                            hasTransferred
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                          }`}
                          title={hasTransferred ? 'มีรายการโอนแล้ว ไม่สามารถลบได้' : 'ลบ'}
                          disabled={hasTransferred}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                    {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการรับหนังสือ'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              แสดง {(currentPage - 1) * PAGE_SIZE + 1} ถึง {Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Receive Modal - เหมือนเดิม */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold dark:text-white">รับหนังสือจากสำนักพิมพ์</h3>
              {selectedGrade && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  ครั้งที่ {deliveryNumber}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชั้นเรียน <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่รับ</label>
                <input
                  type="date"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="หมายเหตุ (ถ้ามี)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {loadingBooks && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-500 dark:text-gray-400">กำลังโหลดรายการหนังสือ...</span>
              </div>
            )}

            {!loadingBooks && selectedGrade && filteredBooks.length > 0 && (
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
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
                        <tr key={book.book_id} className="border-b dark:border-gray-700">
                          <td className="px-3 py-3 dark:text-gray-300">{idx + 1}</td>
                          <td className="px-3 py-3 dark:text-gray-300">{book.title}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{book.typeofbook_name || '-'}</td>
                          <td className="px-3 py-3 text-center dark:text-gray-300">{book.total_ordered}</td>
                          <td className="px-3 py-3 text-center text-green-600 dark:text-green-400 font-medium">{book.total_received}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={remaining > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-400'}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              ref={el => inputRefs.current[book.book_id] = el}
                              className="w-20 text-center border dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white"
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

            {!loadingBooks && selectedGrade && filteredBooks.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-8 text-center mb-4">
                <BookOpen size={40} className="text-yellow-400 mx-auto mb-3" />
                <p className="text-yellow-700 dark:text-yellow-400 whitespace-pre-line">{noDataReason || 'ไม่พบรายการหนังสือสำหรับชั้นและกลุ่มสาระที่เลือก'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  กรุณาตรวจสอบว่ามีคำสั่งซื้อสำหรับชั้นนี้แล้วหรือยังในหน้า "จัดการคำสั่งซื้อ"
                </p>
              </div>
            )}

            {!loadingBooks && !selectedGrade && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center mb-4">
                <Package size={40} className="text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">กรุณาเลือกชั้นเรียนเพื่อแสดงรายการหนังสือ</p>
              </div>
            )}

            {selectedGrade && filteredBooks.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>รวมรับครั้งนี้:</strong> {Object.values(receiveItems).reduce((a, b) => a + b, 0)} เล่ม
                  จาก {filteredBooks.length} รายการ
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 border dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
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

      {/* Detail Modal - เหมือนเดิม */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 dark:text-white">รายละเอียดใบรับหนังสือ</h3>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500 dark:text-gray-400">เลขที่:</span> <span className="font-medium dark:text-white">{selectedReceipt.receipt_number || '-'}</span></p>
              <p><span className="text-gray-500 dark:text-gray-400">วันที่รับ:</span> <span className="font-medium dark:text-white">{selectedReceipt.receipt_date ? new Date(selectedReceipt.receipt_date).toLocaleDateString('th-TH') : '-'}</span></p>
              <p><span className="text-gray-500 dark:text-gray-400">ชั้น:</span> <span className="font-medium dark:text-white">{gradeLabel[selectedReceipt.grade] || selectedReceipt.grade || '-'}</span></p>
              <p><span className="text-gray-500 dark:text-gray-400">ครั้งที่:</span> <span className="font-medium dark:text-white">{selectedReceipt.delivery_number || '-'}</span></p>
              <p className="col-span-2"><span className="text-gray-500 dark:text-gray-400">กลุ่มสาระ:</span> <span className="font-medium dark:text-white">{selectedReceipt.subject_group || 'ทุกกลุ่มสาระ'}</span></p>
              {selectedReceipt.notes && (
                <p className="col-span-2"><span className="text-gray-500 dark:text-gray-400">หมายเหตุ:</span> <span className="font-medium dark:text-white">{selectedReceipt.notes}</span></p>
              )}
            </div>

            {selectedReceipt.book_receipt_items && selectedReceipt.book_receipt_items.length > 0 ? (
              <table className="w-full text-sm border dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">รายการหนังสือ</th>
                    <th className="text-center px-4 py-2 w-24">จำนวนรับ</th>
                    <th className="text-center px-4 py-2 w-24">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceipt.book_receipt_items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t dark:border-gray-700">
                      <td className="px-4 py-2 dark:text-gray-300">{idx + 1}</td>
                      <td className="px-4 py-2 dark:text-gray-300">{item.books?.title || '-'}</td>
                      <td className="px-4 py-2 text-center font-medium text-green-600 dark:text-green-400">{item.received_qty || 0}</td>
                      <td className="px-4 py-2 text-center">
                        {item.transferred_to_stock ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            โอนแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                            รอโอน
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600">
                    <td colSpan={2} className="px-4 py-2 text-right font-medium dark:text-gray-300">รวมทั้งสิ้น:</td>
                    <td className="px-4 py-2 text-center font-bold text-green-600 dark:text-green-400">
                      {selectedReceipt.book_receipt_items.reduce((s, i) => s + (i.received_qty || 0), 0)} เล่ม
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">ไม่มีรายการหนังสือ</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - ปรับปรุงใหม่ */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold dark:text-white">แก้ไข / โอนไปสต๊อก</h3>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {editingReceipt.receipt_number}
              </span>
            </div>

            {/* ข้อมูลพื้นฐาน */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชั้นเรียน</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  value={gradeLabel[editingReceipt.grade] || editingReceipt.grade}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ครั้งที่</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  value={`ครั้งที่ ${editingReceipt.delivery_number}`}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">กลุ่มสาระ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  value={editingReceipt.subject_group || 'ทุกกลุ่มสาระ'}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่รับ</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  value={editReceiptDate}
                  onChange={e => setEditReceiptDate(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="หมายเหตุ (ถ้ามี)"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ปุ่มเลือก/ยกเลิกทั้งหมด */}
            <div className="flex items-center justify-between mb-3 px-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newSelected = {}
                    editingReceipt.book_receipt_items?.forEach(item => {
                      newSelected[item.id] = !item.transferred_to_stock
                    })
                    setSelectedForTransfer(newSelected)
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  เลือกทั้งหมด (รายการที่ยังไม่โอน)
                </button>
                <button
                  onClick={() => {
                    const newSelected = {}
                    editingReceipt.book_receipt_items?.forEach(item => {
                      newSelected[item.id] = false
                    })
                    setSelectedForTransfer(newSelected)
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                เลือก: <strong className="dark:text-white">{Object.values(selectedForTransfer).filter(Boolean).length}</strong> รายการ
              </p>
            </div>

            {/* ตารางหนังสือ */}
            {editingBooks && editingBooks.length > 0 ? (
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                      <th className="text-center px-3 py-2 w-12">
                        <span className="text-xs">เลือก</span>
                      </th>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-3 py-2">รายการหนังสือ</th>
                      <th className="text-left px-3 py-2">กลุ่มสาระ</th>
                      <th className="text-center px-3 py-2 w-20">สั่ง</th>
                      <th className="text-center px-3 py-2 w-20">รับแล้ว</th>
                      <th className="text-center px-3 py-2 w-20">คงเหลือ</th>
                      <th className="text-center px-3 py-2 w-28">จำนวนรับ<br/><span className="text-xs font-normal text-gray-500 dark:text-gray-400">(ครั้งนี้)</span></th>
                      <th className="text-center px-3 py-2 w-24">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingReceipt.book_receipt_items?.map((receiptItem, idx) => {
                      const book = editingBooks.find(b => b.book_id === receiptItem.book_id)
                      if (!book) return null

                      const remaining = book.total_ordered - book.total_received
                      const currentQty = editReceiveItems[book.book_id] || 0
                      const isTransferred = receiptItem.transferred_to_stock

                      return (
                        <tr key={receiptItem.id} className={`border-b dark:border-gray-700 ${isTransferred ? 'bg-green-50/50 dark:bg-green-900/20' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            {isTransferred ? (
                              <div className="flex items-center justify-center" title="โอนแล้ว">
                                <CheckSquare size={18} className="text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <input
                                type="checkbox"
                                className="w-4 h-4 cursor-pointer"
                                checked={selectedForTransfer[receiptItem.id] || false}
                                onChange={e => {
                                  setSelectedForTransfer(prev => ({
                                    ...prev,
                                    [receiptItem.id]: e.target.checked
                                  }))
                                }}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 dark:text-gray-300">{idx + 1}</td>
                          <td className="px-3 py-3 dark:text-gray-300">{book.title}</td>
                          <td className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{book.typeofbook_name || '-'}</td>
                          <td className="px-3 py-3 text-center dark:text-gray-300">{book.total_ordered}</td>
                          <td className="px-3 py-3 text-center text-green-600 dark:text-green-400 font-medium">{book.total_received}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={remaining > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-400'}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isTransferred ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">{currentQty}</span>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                className="w-20 text-center border dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white"
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
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isTransferred ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                โอนแล้ว
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                                รอโอน
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center mb-4">
                <BookOpen size={40} className="text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">กำลังโหลดรายการหนังสือ...</p>
              </div>
            )}

            {/* Summary */}
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>รวมรับทั้งหมด:</strong> {Object.values(editReceiveItems).reduce((a, b) => a + b, 0)} เล่ม
                จาก {editingReceipt.book_receipt_items?.length || 0} รายการ
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <strong className="dark:text-gray-300">เลือกโอนไปสต๊อก:</strong> {Object.values(selectedForTransfer).filter(Boolean).length} รายการ
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border dark:border-gray-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                ปิด
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleTransferSelectedToStock}
                  disabled={saving || Object.values(selectedForTransfer).filter(Boolean).length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                  โอนไปสต๊อก ({Object.values(selectedForTransfer).filter(Boolean).length})
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
        </div>
      )}
    </div>
  )
}
