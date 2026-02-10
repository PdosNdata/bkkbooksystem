import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Plus, Eye, Printer, Upload, CheckCircle, Clock, Loader2, FileText, User, Check, Square, CheckSquare, Edit, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import { useAuth } from '../../context/AuthContext'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const gradeOptions = ['kg2', 'kg3', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3']
const PAGE_SIZE = 10

export default function WithdrawalsPage11() {
  const { user } = useAuth()
  const [withdrawals, setWithdrawals] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null)
  const [withdrawItems, setWithdrawItems] = useState({})
  const [editingItems, setEditingItems] = useState([])
  const [signatureFile, setSignatureFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // New modal state
  const [showNewWithdrawalModal, setShowNewWithdrawalModal] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [officers, setOfficers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().slice(0, 10))
  const [availableBooks, setAvailableBooks] = useState([])
  const [selectedBooks, setSelectedBooks] = useState({})
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [nextWithdrawalNumber, setNextWithdrawalNumber] = useState('')

  useEffect(() => {
    fetchData()
    fetchTeachers()
    fetchOfficers()

    // ตั้งค่าผู้จ่ายพัสดุอัตโนมัติเป็น user ที่ login อยู่
    if (user && (user.role === 'staff' || user.role === 'admin')) {
      setSelectedOfficer(user.id)
    }
  }, [user])

  // Fetch teachers when teacher or grade changes
  useEffect(() => {
    if (selectedTeacher && selectedGrade) {
      fetchAvailableBooks()
    } else {
      setAvailableBooks([])
      setSelectedBooks({})
    }
  }, [selectedTeacher, selectedGrade])

  // ดึงเลขที่ใบเบิกถัดไปเมื่อเปิด modal
  useEffect(() => {
    if (showNewWithdrawalModal) {
      previewNextWithdrawalNumber()
    }
  }, [showNewWithdrawalModal, withdrawalDate])

  // ฟังก์ชันสร้างเลขที่ใบเบิกจาก document_sequences
  const generateWithdrawalNumber = async () => {
    try {
      const { data, error } = await supabase
        .rpc('generate_document_number', {
          doc_type_code: 'W'
        })

      if (error) {
        console.error('Error generating document number:', error)
        // ถ้าเกิดข้อผิดพลาด ใช้เลขสำรอง
        const currentYear = new Date().getFullYear() + 543
        return `บ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}/${currentYear}`
      }

      return data
    } catch (err) {
      console.error('Generate number error:', err)
      const currentYear = new Date().getFullYear() + 543
      return `บ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}/${currentYear}`
    }
  }

  // ฟังก์ชันดูตัวอย่างเลขที่ถัดไป (ไม่เพิ่มจริง)
  const previewNextWithdrawalNumber = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543

      // ดึงข้อมูล sequence ปัจจุบัน
      const { data, error } = await supabase
        .from('document_sequences')
        .select('last_number')
        .eq('document_type_code', 'W')
        .eq('year', currentYear)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = ไม่พบข้อมูล
        console.error('Error fetching sequence:', error)
        setNextWithdrawalNumber(`บ001/${currentYear}`)
        return
      }

      const nextNumber = (data?.last_number || 0) + 1
      const prefix = 'บ' // จาก document_types
      const previewNumber = `${prefix}${String(nextNumber).padStart(3, '0')}/${currentYear}`
      setNextWithdrawalNumber(previewNumber)
    } catch (err) {
      console.error('Preview number error:', err)
      const currentYear = new Date().getFullYear() + 543
      setNextWithdrawalNumber(`บ001/${currentYear}`)
    }
  }

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'teacher')
      .order('full_name')

    if (error) {
      console.error('fetchTeachers error:', error)
      setTeachers([])
    } else {
      setTeachers(data || [])
    }
  }

  const fetchOfficers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .in('role', ['admin', 'staff'])
      .order('full_name')

    if (error) {
      console.error('fetchOfficers error:', error)
      setOfficers([])
    } else {
      setOfficers(data || [])
    }
  }

  const fetchAvailableBooks = async () => {
    setLoadingBooks(true)
    try {
      // ใช้ปีปัจจุบัน + 543 เป็นปีการศึกษา (พ.ศ.)
      const currentYear = new Date().getFullYear()
      const academicYear = currentYear + 543 // แปลงเป็น พ.ศ.

      console.log('🔍 Fetching books for:', { grade: selectedGrade, academicYear })

      const { data: stockData, error: stockError } = await supabase
        .from('book_stock')
        .select(`
          id,
          book_id,
          available_quantity,
          distributed_quantity,
          quantity,
          books(id, title, price)
        `)
        .eq('grade', selectedGrade)
        .eq('academic_year', academicYear.toString()) // ใช้ปี พ.ศ.
        .gt('available_quantity', 0)

      if (stockError) {
        console.error('Error fetching stock:', stockError)
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: stockError.message
        })
        setAvailableBooks([])
        setSelectedBooks({})
        setLoadingBooks(false)
        return
      }

      console.log('📦 Stock data found:', stockData?.length || 0, 'items')

      if (stockData && stockData.length > 0) {
        // ดึงข้อมูล order เพื่อเอา order_id (ใช้ order แรกที่เจอ)
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, classroom')
          .eq('teacher_id', selectedTeacher)
          .eq('grade', selectedGrade)
          .in('status', ['approved', 'completed', 'shipped'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const defaultOrderId = orderData?.id || null
        const defaultOrderNumber = orderData?.order_number || '-'
        const defaultClassroom = orderData?.classroom || '-'

        // แปลง stock data ให้เป็นรูปแบบที่ใช้งาน
        const allBooks = stockData.map(stock => ({
          book_id: stock.book_id,
          quantity: stock.quantity,
          received_quantity: stock.available_quantity, // ใช้ available_quantity แทน
          books: stock.books,
          order_id: defaultOrderId,
          order_number: defaultOrderNumber,
          classroom: defaultClassroom,
          stock_id: stock.id,
          distributed_quantity: stock.distributed_quantity
        }))

        console.log('✅ Available books:', allBooks.length, 'items')
        setAvailableBooks(allBooks)
      } else {
        console.warn('⚠️ No stock found for grade:', selectedGrade, 'year:', academicYear)
        setAvailableBooks([])
      }
      setSelectedBooks({})
    } catch (err) {
      console.error('Fetch error:', err)
      setAvailableBooks([])
      setSelectedBooks({})
    }
    setLoadingBooks(false)
  }
  const fetchData = async () => {
    setLoading(true)

    // ดึงข้อมูล withdrawals พร้อม relations
    const { data: wData, error: wError } = await supabase
      .from('withdrawals')
      .select(`
        *,
        orders!withdrawals_order_id_fkey(
          order_number, 
          classroom, 
          grade, 
          year, 
          teacher_id,
          users!orders_teacher_id_fkey(full_name)
        ),
        withdrawal_items(
          id,
          book_id, 
          requested_qty, 
          approved_qty,
          notes,
          books(title)
        ),
        issued_by_user:users!withdrawals_issued_by_fkey(full_name),
        requested_by_user:users!withdrawals_requested_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (wError) {
      console.error('Error fetching withdrawals:', wError)
    }

    // ดึงข้อมูล orders
    const { data: oData, error: oError } = await supabase
      .from('orders')
      .select(`
        *,
        users!orders_teacher_id_fkey(full_name),
        order_items(book_id, quantity, received_quantity, books(title, price))
      `)
      .order('created_at', { ascending: false })

    if (oError) {
      console.error('Error fetching orders:', oError)
    }

    const validOrders = (oData || []).filter(order =>
      order.status &&
      order.status !== 'pending' &&
      order.status !== 'draft' &&
      order.status !== 'cancelled'
    )

    console.log('Fetched withdrawals:', wData)
    console.log('Fetched orders:', validOrders)

    setWithdrawals(wData || [])
    setOrders(validOrders)
    setLoading(false)
  }

  const openCreateModal = (order) => {
    setSelectedOrder(order)
    const items = {}
    order.order_items?.forEach(item => {
      items[item.book_id] = { requested: item.quantity, approved: item.quantity }
    })
    setWithdrawItems(items)
    setShowModal(true)
  }

  const openDetailModal = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setShowDetailModal(true)
  }

  const openEditModal = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    // แปลง withdrawal_items ให้เป็น array สำหรับแก้ไข
    const items = withdrawal.withdrawal_items?.map(item => ({
      id: item.id,
      book_id: item.book_id,
      book_title: item.books?.title || '-',
      requested_qty: item.requested_qty,
      approved_qty: item.approved_qty,
      notes: item.notes || ''
    })) || []
    setEditingItems(items)
    setShowEditModal(true)
  }

  const handleUpdateWithdrawal = async () => {
    if (!selectedWithdrawal) return
    setSaving(true)

    try {
      // คำนวณการเปลี่ยนแปลงของ stock
      const oldItems = selectedWithdrawal.withdrawal_items || []
      const changes = []

      editingItems.forEach(newItem => {
        const oldItem = oldItems.find(o => o.id === newItem.id)
        if (oldItem && oldItem.approved_qty !== newItem.approved_qty) {
          changes.push({
            book_id: newItem.book_id,
            oldQty: oldItem.approved_qty,
            newQty: newItem.approved_qty,
            diff: newItem.approved_qty - oldItem.approved_qty // บวก = เบิกเพิ่ม, ลบ = คืน
          })
        }
      })

      // อัปเดต stock ตามการเปลี่ยนแปลง
      const currentYear = new Date().getFullYear()
      const stockUpdateErrors = []

      for (const change of changes) {
        try {
          const { data: stockData, error: stockFetchError } = await supabase
            .from('book_stock')
            .select('id, available_quantity, distributed_quantity')
            .eq('book_id', change.book_id)
            .eq('grade', selectedWithdrawal.orders?.grade)
            .eq('academic_year', currentYear.toString())
            .maybeSingle()

          if (stockFetchError) {
            console.error('Error fetching stock:', stockFetchError)
            stockUpdateErrors.push(`หนังสือ ID ${change.book_id}`)
            continue
          }

          if (stockData) {
            // ถ้า diff บวก = เบิกเพิ่ม (ลด available, เพิ่ม distributed)
            // ถ้า diff ลบ = คืน (เพิ่ม available, ลด distributed)
            const newAvailable = Math.max(0, stockData.available_quantity - change.diff)
            const newDistributed = Math.max(0, stockData.distributed_quantity + change.diff)

            const { error: stockUpdateError } = await supabase
              .from('book_stock')
              .update({
                available_quantity: newAvailable,
                distributed_quantity: newDistributed,
                updated_at: new Date().toISOString()
              })
              .eq('id', stockData.id)

            if (stockUpdateError) {
              console.error('Error updating stock:', stockUpdateError)
              stockUpdateErrors.push(`หนังสือ ID ${change.book_id}`)
            } else {
              console.log(`Stock updated for book ${change.book_id}: available ${stockData.available_quantity} → ${newAvailable}, distributed ${stockData.distributed_quantity} → ${newDistributed}`)
            }
          }
        } catch (err) {
          console.error('Stock update error:', err)
          stockUpdateErrors.push(`หนังสือ ID ${change.book_id}`)
        }
      }

      // คำนวณผลรวมใหม่
      const totalRequested = editingItems.reduce((sum, item) => sum + (item.requested_qty || 0), 0)
      const totalApproved = editingItems.reduce((sum, item) => sum + (item.approved_qty || 0), 0)

      // อัปเดตข้อมูลหลักของใบเบิก
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({
          total_requested: totalRequested,
          total_approved: totalApproved,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id)

      if (updateError) throw updateError

      // อัปเดตแต่ละรายการ
      for (const item of editingItems) {
        if (item.id) {
          const { error: itemError } = await supabase
            .from('withdrawal_items')
            .update({
              requested_qty: item.requested_qty,
              approved_qty: item.approved_qty,
              notes: item.notes || null
            })
            .eq('id', item.id)

          if (itemError) throw itemError
        }
      }

      if (stockUpdateErrors.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'แก้ไขใบเบิกสำเร็จ',
          html: `แก้ไขใบเบิกสำเร็จ<br><small class="text-yellow-600">หมายเหตุ: บางรายการอาจไม่สามารถอัปเดต stock ได้</small>`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: 'แก้ไขใบเบิกสำเร็จ',
          timer: 1500,
          showConfirmButton: false
        })
      }

      setShowEditModal(false)
      fetchData()
    } catch (error) {
      console.error('Update error:', error)
      Swal.fire({
        icon: 'error',
        title: 'แก้ไขไม่สำเร็จ',
        text: error.message
      })
    }
    setSaving(false)
  }

  const handleDeleteItem = async (itemId, itemIndex) => {
    const result = await Swal.fire({
      title: 'ลบรายการนี้?',
      text: 'จำนวนที่เบิกจะถูกคืนเข้า stock',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    })

    if (!result.isConfirmed) return

    const item = editingItems[itemIndex]

    try {
      if (itemId) {
        // คืน stock
        const currentYear = new Date().getFullYear()
        const { data: stockData, error: stockFetchError } = await supabase
          .from('book_stock')
          .select('id, available_quantity, distributed_quantity')
          .eq('book_id', item.book_id)
          .eq('grade', selectedWithdrawal.orders?.grade)
          .eq('academic_year', currentYear.toString())
          .maybeSingle()

        if (!stockFetchError && stockData) {
          await supabase
            .from('book_stock')
            .update({
              available_quantity: stockData.available_quantity + item.approved_qty,
              distributed_quantity: Math.max(0, stockData.distributed_quantity - item.approved_qty),
              updated_at: new Date().toISOString()
            })
            .eq('id', stockData.id)

          console.log(`Stock restored for book ${item.book_id}: +${item.approved_qty} to available`)
        }

        // ลบจากฐานข้อมูล
        const { error } = await supabase
          .from('withdrawal_items')
          .delete()
          .eq('id', itemId)

        if (error) throw error
      }

      // ลบจาก state
      const newItems = editingItems.filter((_, index) => index !== itemIndex)
      setEditingItems(newItems)

      Swal.fire({
        icon: 'success',
        title: 'ลบรายการสำเร็จ',
        text: 'จำนวนถูกคืนเข้า stock แล้ว',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Delete error:', error)
      Swal.fire({
        icon: 'error',
        title: 'ลบไม่สำเร็จ',
        text: error.message
      })
    }
  }

  const updateEditingItem = (index, field, value) => {
    setEditingItems(prev => {
      const newItems = [...prev]
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
      // ถ้าแก้ requested_qty ให้ approved_qty ไม่เกิน requested_qty
      if (field === 'requested_qty' && newItems[index].approved_qty > value) {
        newItems[index].approved_qty = value
      }
      return newItems
    })
  }

  const handleCreateWithdrawal = async () => {
    if (!selectedOrder) return
    setSaving(true)

    // ใช้ฟังก์ชันสร้างเลขที่ใบเบิกจาก document_sequences
    const withdrawalNumber = await generateWithdrawalNumber()

    const { data: wData, error: wError } = await supabase.from('withdrawals').insert({
      order_id: selectedOrder.id,
      withdrawal_number: withdrawalNumber,
      status: 'pending',
      requested_by: selectedOrder.teacher_id,
    }).select().single()

    if (wError) {
      Swal.fire({ icon: 'error', title: 'สร้างใบเบิกไม่สำเร็จ', text: wError.message })
      setSaving(false)
      return
    }

    const items = Object.entries(withdrawItems).map(([bookId, qty]) => ({
      withdrawal_id: wData.id,
      book_id: bookId,
      requested_qty: qty.requested,
      approved_qty: qty.approved,
    }))

    const { error: itemError } = await supabase.from('withdrawal_items').insert(items)

    if (itemError) {
      Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: itemError.message })
    } else {
      Swal.fire({ icon: 'success', title: 'สร้างใบเบิกสำเร็จ', text: `เลขที่: ${withdrawalNumber}`, confirmButtonColor: '#2563eb' })
      setShowModal(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleApprove = async (withdrawal) => {
    const result = await Swal.fire({
      title: 'อนุมัติใบเบิก?',
      text: `เลขที่: ${withdrawal.withdrawal_number}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#16a34a',
    })
    if (!result.isConfirmed) return

    await supabase.from('withdrawals').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', withdrawal.id)

    Swal.fire({ icon: 'success', title: 'อนุมัติสำเร็จ', timer: 1200, showConfirmButton: false })
    fetchData()
  }

  const handleSignatureUpload = async (e, withdrawalId) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `signature_${withdrawalId}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, file)

    if (uploadError) {
      Swal.fire({ icon: 'error', title: 'อัพโหลดไม่สำเร็จ', text: uploadError.message })
      return
    }

    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName)

    await supabase.from('withdrawals').update({
      officer_signature: urlData.publicUrl
    }).eq('id', withdrawalId)

    Swal.fire({ icon: 'success', title: 'อัพโหลดลายเซ็นสำเร็จ', timer: 1200, showConfirmButton: false })
    fetchData()
  }

  const toggleBookSelection = (bookId, receivedQty) => {
    setSelectedBooks(prev => {
      if (prev[bookId]) {
        const newState = { ...prev }
        delete newState[bookId]
        return newState
      } else {
        return {
          ...prev,
          [bookId]: {
            requested: receivedQty,
            approved: receivedQty,
            notes: ''
          }
        }
      }
    })
  }

  const toggleSelectAll = () => {
    if (Object.keys(selectedBooks).length === availableBooks.length) {
      setSelectedBooks({})
    } else {
      const allSelected = {}
      availableBooks.forEach(item => {
        allSelected[item.book_id] = {
          requested: item.received_quantity,
          approved: item.received_quantity,
          notes: ''
        }
      })
      setSelectedBooks(allSelected)
    }
  }

  const updateRequestedQty = (bookId, value) => {
    setSelectedBooks(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        requested: Math.max(0, Number(value))
      }
    }))
  }

  const updateApprovedQty = (bookId, value) => {
    const requestedQty = selectedBooks[bookId]?.requested || 0
    setSelectedBooks(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        approved: Math.max(0, Math.min(Number(value), requestedQty))
      }
    }))
  }

  const updateNotes = (bookId, value) => {
    setSelectedBooks(prev => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        notes: value
      }
    }))
  }

  const handleApprovedQtyKeyDown = (e, currentBookId) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      const selectedBookIds = availableBooks
        .filter(item => selectedBooks[item.book_id])
        .map(item => item.book_id)

      const currentIndex = selectedBookIds.indexOf(currentBookId)

      if (currentIndex < selectedBookIds.length - 1) {
        const nextBookId = selectedBookIds[currentIndex + 1]
        const nextInput = document.querySelector(`input[data-approved-qty="${nextBookId}"]`)
        if (nextInput) {
          nextInput.focus()
          nextInput.select()
        }
      }
    }
  }

  const copyRequestedToApproved = () => {
    setSelectedBooks(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(bookId => {
        updated[bookId].approved = updated[bookId].requested
      })
      return updated
    })
  }

  const totalRequested = Object.values(selectedBooks).reduce((sum, item) => sum + (item.requested || 0), 0)
  const totalApproved = Object.values(selectedBooks).reduce((sum, item) => sum + (item.approved || 0), 0)

  const handleCreateNewWithdrawal = async () => {
    if (Object.keys(selectedBooks).length === 0) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกรายการหนังสือ' })
      return
    }
  
    if (!selectedTeacher) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้เบิก (ครู)' })
      return
    }
  
    if (!selectedOfficer) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้จ่ายพัสดุ' })
      return
    }
  
    setSaving(true)
    
    const firstBook = availableBooks.find(book => selectedBooks[book.book_id])
    
    if (!firstBook) {
      Swal.fire({ icon: 'error', title: 'ไม่พบข้อมูล order' })
      setSaving(false)
      return
    }
  
    // ใช้ฟังก์ชันสร้างเลขที่ใบเบิกจาก document_sequences
    const withdrawalNumber = await generateWithdrawalNumber()
  
    const { data: wData, error: wError } = await supabase.from('withdrawals').insert({
      order_id: firstBook.order_id,
      withdrawal_number: withdrawalNumber,
      withdrawal_date: withdrawalDate,
      status: 'pending',
      requested_by: selectedTeacher,
      issued_by: selectedOfficer,
      total_requested: totalRequested,
      total_approved: totalApproved,
    }).select().single()
  
    if (wError) {
      Swal.fire({ icon: 'error', title: 'สร้างใบเบิกไม่สำเร็จ', text: wError.message })
      setSaving(false)
      return
    }
  
    const items = Object.entries(selectedBooks).map(([bookId, item]) => ({
      withdrawal_id: wData.id,
      book_id: bookId,
      requested_qty: item.requested,
      approved_qty: item.approved,
      notes: item.notes || null,
    }))
  
    const { error: itemError } = await supabase.from('withdrawal_items').insert(items)
  
    if (itemError) {
      Swal.fire({ icon: 'error', title: 'เพิ่มรายการไม่สำเร็จ', text: itemError.message })
      setSaving(false)
      return
    }
  
    // อัปเดต book_stock: ลด available_quantity เท่านั้น (distributed_quantity จะคำนวณเอง)
    const currentYear = new Date().getFullYear()
    const academicYear = currentYear + 543
    const stockUpdateErrors = []
    const stockUpdateSuccess = []
    
    for (const [bookId, item] of Object.entries(selectedBooks)) {
      if (item.approved > 0) {
        try {
          // ดึงข้อมูล stock ปัจจุบัน
          const { data: stockData, error: stockFetchError } = await supabase
            .from('book_stock')
            .select('id, available_quantity, distributed_quantity, quantity')
            .eq('book_id', bookId)
            .eq('grade', selectedGrade)
            .eq('academic_year', academicYear.toString())
            .maybeSingle()
  
          if (stockFetchError) {
            console.error('Error fetching stock:', stockFetchError)
            stockUpdateErrors.push({
              bookId,
              error: `ไม่สามารถดึงข้อมูล stock: ${stockFetchError.message}`
            })
            continue
          }
  
          if (stockData) {
            // ตรวจสอบว่ามี available_quantity เพียงพอหรือไม่
            if (stockData.available_quantity < item.approved) {
              stockUpdateErrors.push({
                bookId,
                error: `จำนวนคงเหลือไม่เพียงพอ (มี ${stockData.available_quantity} เบิก ${item.approved})`
              })
              console.warn(`Insufficient stock for book ${bookId}: available=${stockData.available_quantity}, requested=${item.approved}`)
            }
  
            // คำนวณจำนวนใหม่ (ลดเฉพาะ available_quantity)
            const newAvailable = Math.max(0, stockData.available_quantity - item.approved)
  
            // อัปเดต stock (ไม่ต้อง update distributed_quantity เพราะมันคำนวณอัตโนมัติ)
            const { error: stockUpdateError } = await supabase
              .from('book_stock')
              .update({
                available_quantity: newAvailable,
                updated_at: new Date().toISOString()
              })
              .eq('id', stockData.id)
  
            if (stockUpdateError) {
              console.error('Error updating stock:', stockUpdateError)
              stockUpdateErrors.push({
                bookId,
                error: `อัปเดตไม่สำเร็จ: ${stockUpdateError.message}`
              })
            } else {
              const newDistributed = stockData.quantity - newAvailable // คำนวณ distributed ที่คาดว่าจะเป็น
              stockUpdateSuccess.push({
                bookId,
                oldAvailable: stockData.available_quantity,
                newAvailable,
                oldDistributed: stockData.distributed_quantity || 0,
                newDistributed
              })
              console.log(`✅ Stock updated for book ${bookId}: available ${stockData.available_quantity} → ${newAvailable}, distributed ${stockData.distributed_quantity || 0} → ${newDistributed} (auto-calculated)`)
            }
          } else {
            // ไม่พบ stock record
            console.warn(`⚠️ Stock record not found for book ${bookId}, grade ${selectedGrade}, year ${academicYear}`)
            stockUpdateErrors.push({
              bookId,
              error: `ไม่พบข้อมูล stock ในระบบ (กรุณาตรวจสอบการโอนจากใบรับ)`
            })
          }
        } catch (err) {
          console.error('Stock update error:', err)
          stockUpdateErrors.push({
            bookId,
            error: `เกิดข้อผิดพลาด: ${err.message}`
          })
        }
      }
    }
  
    // แสดงผลการอัปเดต
    console.log('Stock update summary:', {
      success: stockUpdateSuccess.length,
      errors: stockUpdateErrors.length,
      details: { stockUpdateSuccess, stockUpdateErrors }
    })
  
    if (stockUpdateErrors.length > 0) {
      const errorDetails = stockUpdateErrors
        .map(e => `- ${e.error}`)
        .join('<br>')
      
      await Swal.fire({ 
        icon: 'warning', 
        title: 'สร้างใบเบิกสำเร็จ', 
        html: `
          <div class="text-left">
            <p class="mb-2">เลขที่: <strong>${withdrawalNumber}</strong></p>
            <p class="mb-2 text-sm text-gray-600">อัปเดต stock สำเร็จ: ${stockUpdateSuccess.length} รายการ</p>
            ${stockUpdateErrors.length > 0 ? `
              <div class="mt-3 p-3 bg-yellow-50 rounded">
                <p class="text-sm font-medium text-yellow-800 mb-2">⚠️ คำเตือน (${stockUpdateErrors.length} รายการ):</p>
                <div class="text-xs text-yellow-700">${errorDetails}</div>
              </div>
            ` : ''}
          </div>
        `,
        confirmButtonColor: '#2563eb',
        width: '600px'
      })
    } else {
      await Swal.fire({ 
        icon: 'success', 
        title: 'สร้างใบเบิกสำเร็จ', 
        html: `
          <p>เลขที่: <strong>${withdrawalNumber}</strong></p>
          <p class="text-sm text-gray-600 mt-2">อัปเดต stock สำเร็จ: ${stockUpdateSuccess.length} รายการ</p>
        `,
        confirmButtonColor: '#2563eb' 
      })
    }
  
    setShowNewWithdrawalModal(false)
    setSelectedTeacher('')
    setSelectedOfficer('')
    setSelectedGrade('')
    setWithdrawalDate(new Date().toISOString().slice(0, 10))
    setAvailableBooks([])
    setSelectedBooks({})
    fetchData()
    setSaving(false)
  }

  const exportPDF = (withdrawal) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()

    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('ใบเบิกพัสดุ', pageW / 2, 20, { align: 'center' })

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`เล่มที่ ...............`, pageW - 50, 30)
    doc.text(`โรงเรียนบ้านค้อดอนแคน สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน`, 14, 40)
    doc.text(`เลขที่ ${withdrawal.withdrawal_number}`, pageW - 50, 40)

    const withdrawalDateObj = withdrawal.withdrawal_date ? new Date(withdrawal.withdrawal_date) : new Date()
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    doc.text(`วันที่ ${withdrawalDateObj.getDate()} เดือน ${thaiMonths[withdrawalDateObj.getMonth()]} พ.ศ. ${withdrawalDateObj.getFullYear() + 543}`, pageW - 80, 47)

    const teacherName = withdrawal.requested_by_user?.full_name || withdrawal.orders?.users?.full_name || '-'
    const classroom = withdrawal.orders?.classroom || '-'
    doc.text(`ข้าพเจ้าของเบิกพัสดุตามรายการต่อไปนี้ เพื่อใช้ในงานการเรียนการสอนในชั้น${classroom}`, 14, 57)

    let y = 65
    doc.setFillColor(240, 240, 240)
    doc.rect(14, y, pageW - 28, 8, 'F')
    doc.setFont('Helvetica', 'bold')
    doc.text('เลขที่', 18, y + 6)
    doc.text('รายการ', 35, y + 6)
    doc.text('จำนวน/หน่วย', 120, y + 6)
    doc.text('หมายเหตุ', 170, y + 6)

    doc.text('ขอเบิก', 120, y + 12)
    doc.text('เบิกได้', 145, y + 12)
    y += 16

    doc.setFont('Helvetica', 'normal')
    withdrawal.withdrawal_items?.forEach((item, idx) => {
      doc.text(String(idx + 1), 18, y + 5)
      doc.text((item.books?.title || '-').substring(0, 50), 35, y + 5)
      doc.text(String(item.requested_qty), 125, y + 5)
      doc.text(String(item.approved_qty), 150, y + 5)
      y += 8
    })

    y = 200
    doc.text('(ลงชื่อ)..........................................................ผู้เบิก', 14, y)
    doc.text(`(${teacherName})`, 25, y + 7)
    doc.text('ตำแหน่ง ครู', 25, y + 14)

    const officerName = withdrawal.issued_by_user?.full_name || '......................................'
    doc.text('อนุญาตให้เบิกได้', 120, y - 10)
    doc.text('(ลงชื่อ)..........................................................ผู้จ่ายพัสดุ', 120, y)
    doc.text(`(${officerName})`, 130, y + 7)
    doc.text('ได้ตรวจหักจำนวนแล้ว', 120, y + 14)
    doc.text('(ลงชื่อ)..........................................................เจ้าหน้าที่พัสดุ', 120, y + 24)

    doc.save(`ใบเบิกพัสดุ_${withdrawal.withdrawal_number}.pdf`)
  }

  const filtered = withdrawals.filter(w => {
    const searchLower = search.toLowerCase()
    const withdrawalNumber = (w.withdrawal_number || '').toLowerCase()
    const classroom = (w.orders?.classroom || '').toLowerCase()
    const teacherName = (w.requested_by_user?.full_name || w.orders?.users?.full_name || '').toLowerCase()

    return withdrawalNumber.includes(searchLower) ||
      classroom.includes(searchLower) ||
      teacherName.includes(searchLower)
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
    }
    const labels = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', completed: 'เบิกแล้ว' }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">เบิกหนังสือ</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการใบเบิกหนังสือเรียน</p>
        </div>
        <button
          onClick={() => setShowNewWithdrawalModal(true)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} /> เพิ่มใบเบิกพัสดุ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50"><FileText size={24} className="text-blue-600" /></div>
          <div><p className="text-sm text-gray-500">ใบเบิกทั้งหมด</p><p className="text-2xl font-bold">{withdrawals.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-50"><Clock size={24} className="text-yellow-600" /></div>
          <div><p className="text-sm text-gray-500">รออนุมัติ</p><p className="text-2xl font-bold">{withdrawals.filter(w => w.status === 'pending').length}</p></div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50"><CheckCircle size={24} className="text-green-600" /></div>
          <div><p className="text-sm text-gray-500">อนุมัติแล้ว</p><p className="text-2xl font-bold">{withdrawals.filter(w => w.status === 'approved').length}</p></div>
        </div>
      </div>

      {/* Orders that can be withdrawn */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">คำสั่งซื้อที่พร้อมให้เบิก</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">เลขที่คำสั่งซื้อ</th>
                  <th className="text-left px-4 py-3 font-medium">ครูผู้สั่ง</th>
                  <th className="text-center px-4 py-3 font-medium">ชั้นเรียน</th>
                  <th className="text-center px-4 py-3 font-medium">ปี</th>
                  <th className="text-center px-4 py-3 font-medium">จำนวนรายการ</th>
                  <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{order.order_number}</td>
                    <td className="px-4 py-3">{order.users?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-center">{order.classroom}</td>
                    <td className="px-4 py-3 text-center">{order.year}</td>
                    <td className="px-4 py-3 text-center">{order.order_items?.length || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openCreateModal(order)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                        <Plus size={14} className="inline mr-1" /> สร้างใบเบิก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawals List */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h3 className="font-semibold">รายการใบเบิก</h3>
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">เลขที่ใบเบิก</th>
                <th className="text-left px-4 py-3 font-medium">วันที่เบิก</th>
                <th className="text-left px-4 py-3 font-medium">ผู้เบิก</th>
                <th className="text-center px-4 py-3 font-medium">ชั้นเรียน</th>
                <th className="text-center px-4 py-3 font-medium">รวมเล่ม</th>
                <th className="text-center px-4 py-3 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map(w => {
                const teacherName = w.requested_by_user?.full_name || w.orders?.users?.full_name || '-'
                const classroom = w.orders?.classroom || '-'

                return (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{w.withdrawal_number}</td>
                    <td className="px-4 py-3">{w.withdrawal_date ? new Date(w.withdrawal_date).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="px-4 py-3">{teacherName}</td>
                    <td className="px-4 py-3 text-center">{classroom}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-600">{w.total_approved || 0}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(w.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openDetailModal(w)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="ดูรายละเอียด"><Eye size={16} /></button>
                        {w.status === 'pending' && (
                          <button onClick={() => openEditModal(w)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="แก้ไข"><Edit size={16} /></button>
                        )}
                        <button onClick={() => exportPDF(w)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="พิมพ์"><Printer size={16} /></button>
                        {w.status === 'pending' && (
                          <button onClick={() => handleApprove(w)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="อนุมัติ"><CheckCircle size={16} /></button>
                        )}
                        {w.status === 'approved' && !w.officer_signature && (
                          <>
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={e => handleSignatureUpload(e, w.id)} />
                            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="อัพโหลดลายเซ็น"><Upload size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">ไม่พบรายการ</td></tr>}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">แสดง {(currentPage - 1) * PAGE_SIZE + 1} ถึง {Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length}</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 rounded-lg text-sm ${p === currentPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Withdrawal Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">สร้างใบเบิกหนังสือ</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm"><span className="text-gray-500">เลขที่คำสั่งซื้อ:</span> <span className="font-medium">{selectedOrder.order_number}</span></p>
              <p className="text-sm"><span className="text-gray-500">ผู้เบิก:</span> <span className="font-medium">{selectedOrder.users?.full_name || '-'}</span></p>
              <p className="text-sm"><span className="text-gray-500">ชั้นเรียน:</span> <span className="font-medium">{selectedOrder.classroom}</span></p>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2">รายการ</th>
                  <th className="text-center px-3 py-2 w-24">ขอเบิก</th>
                  <th className="text-center px-3 py-2 w-24">เบิกได้</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.order_items?.map(item => (
                  <tr key={item.book_id} className="border-b">
                    <td className="px-3 py-2">{item.books?.title}</td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        className="w-16 text-center border rounded px-2 py-1"
                        value={withdrawItems[item.book_id]?.approved || 0}
                        onChange={e => setWithdrawItems(p => ({
                          ...p,
                          [item.book_id]: { ...p[item.book_id], approved: Math.min(Number(e.target.value), item.quantity) }
                        }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">ยกเลิก</button>
              <button onClick={handleCreateWithdrawal} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                สร้างใบเบิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">รายละเอียดใบเบิก</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">เลขที่:</span> <span className="font-medium">{selectedWithdrawal.withdrawal_number}</span></p>
              <p><span className="text-gray-500">วันที่เบิก:</span> <span className="font-medium">{selectedWithdrawal.withdrawal_date ? new Date(selectedWithdrawal.withdrawal_date).toLocaleDateString('th-TH') : '-'}</span></p>
              <p><span className="text-gray-500">ผู้เบิก:</span> <span className="font-medium">{selectedWithdrawal.requested_by_user?.full_name || selectedWithdrawal.orders?.users?.full_name || '-'}</span></p>
              <p><span className="text-gray-500">ผู้จ่ายพัสดุ:</span> <span className="font-medium">{selectedWithdrawal.issued_by_user?.full_name || '-'}</span></p>
              <p><span className="text-gray-500">ชั้นเรียน:</span> <span className="font-medium">{selectedWithdrawal.orders?.classroom || '-'}</span></p>
              <p><span className="text-gray-500">สถานะ:</span> {statusBadge(selectedWithdrawal.status)}</p>
              <p><span className="text-gray-500">รวมขอเบิก:</span> <span className="font-medium text-blue-600">{selectedWithdrawal.total_requested || 0} เล่ม</span></p>
              <p><span className="text-gray-500">รวมเบิกได้:</span> <span className="font-medium text-green-600">{selectedWithdrawal.total_approved || 0} เล่ม</span></p>
            </div>

            <table className="w-full text-sm mb-4 border rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">รายการ</th>
                  <th className="text-center px-3 py-2">ขอเบิก</th>
                  <th className="text-center px-3 py-2">เบิกได้</th>
                </tr>
              </thead>
              <tbody>
                {selectedWithdrawal.withdrawal_items?.map((item, idx) => (
                  <tr key={item.book_id} className="border-b">
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{item.books?.title}</td>
                    <td className="px-3 py-2 text-center">{item.requested_qty}</td>
                    <td className="px-3 py-2 text-center font-medium text-green-600">{item.approved_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedWithdrawal.officer_signature && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">ลายเซ็นเจ้าหน้าที่พัสดุ:</p>
                <img src={selectedWithdrawal.officer_signature} alt="ลายเซ็น" className="h-20 border rounded" />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50">ปิด</button>
              <button onClick={() => exportPDF(selectedWithdrawal)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
                <Printer size={16} className="inline mr-2" /> พิมพ์ใบเบิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Withdrawal Modal */}
      {showNewWithdrawalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">เพิ่มใบเบิกพัสดุ</h3>

            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบเบิก (ถัดไป)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm bg-blue-50 font-mono font-bold text-blue-700"
                  value={nextWithdrawalNumber || 'กำลังโหลด...'}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เบิก <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={withdrawalDate}
                  onChange={e => setWithdrawalDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้เบิก (ครู) <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                >
                  <option value="">-- เลือกครู --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จ่ายพัสดุ <span className="text-red-500">*</span></label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedOfficer}
                  onChange={e => setSelectedOfficer(e.target.value)}
                >
                  <option value="">-- เลือกผู้จ่ายพัสดุ --</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grade Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">เลือกชั้นเรียน <span className="text-red-500">*</span></label>
              <select
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
              >
                <option value="">-- เลือกชั้นเรียน --</option>
                {gradeOptions.map(g => (
                  <option key={g} value={g}>{gradeLabel[g]}</option>
                ))}
              </select>
            </div>

            {/* Loading state */}
            {loadingBooks && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-500">กำลังโหลดรายการหนังสือ...</span>
              </div>
            )}

            {/* Books List */}
            {!loadingBooks && selectedTeacher && selectedGrade && (
              <>
                {availableBooks.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-sm">รายการหนังสือที่ได้รับจากสำนักพิมพ์</span>
                        <button
                          onClick={toggleSelectAll}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {Object.keys(selectedBooks).length === availableBooks.length ? (
                            <><CheckSquare size={16} /> ยกเลิกทั้งหมด</>
                          ) : (
                            <><Square size={16} /> เลือกทั้งหมด</>
                          )}
                        </button>
                      </div>
                      {Object.keys(selectedBooks).length > 0 && (
                        <button
                          onClick={copyRequestedToApproved}
                          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-1"
                        >
                          <Check size={16} /> คัดลอกจำนวนขอเบิก → เบิกได้
                        </button>
                      )}
                    </div>

                    {Object.keys(selectedBooks).length === 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="w-10 px-3 py-2"></th>
                            <th className="text-left px-3 py-2">รายการ</th>
                            <th className="text-center px-3 py-2 w-32">คงเหลือในคลัง</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableBooks.map(item => (
                            <tr
                              key={item.book_id}
                              className="border-b cursor-pointer hover:bg-blue-50"
                              onClick={() => toggleBookSelection(item.book_id, item.received_quantity)}
                            >
                              <td className="px-3 py-3 text-center">
                                <Square size={18} className="text-gray-400 mx-auto" />
                              </td>
                              <td className="px-3 py-3">{item.books?.title}</td>
                              <td className="px-3 py-3 text-center font-medium">{item.received_quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="w-10 px-3 py-2"></th>
                              <th className="text-left px-3 py-2">รายการหนังสือ</th>
                              <th className="text-center px-3 py-2 w-28">จำนวนขอเบิก</th>
                              <th className="text-center px-3 py-2 w-28">จำนวนเบิกได้</th>
                              <th className="text-left px-3 py-2 w-48">หมายเหตุ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availableBooks.filter(item => selectedBooks[item.book_id]).map(item => (
                              <tr key={item.book_id} className="border-b bg-blue-50">
                                <td className="px-3 py-3 text-center">
                                  <button
                                    onClick={() => toggleBookSelection(item.book_id, item.received_quantity)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <CheckSquare size={18} className="mx-auto" />
                                  </button>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-medium">{item.books?.title}</div>
                                  <div className="text-xs text-gray-500">คงเหลือ: {item.received_quantity} เล่ม</div>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.received_quantity}
                                    value={selectedBooks[item.book_id]?.requested || 0}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      updateRequestedQty(item.book_id, e.target.value)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={selectedBooks[item.book_id]?.requested || 0}
                                    value={selectedBooks[item.book_id]?.approved || 0}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      updateApprovedQty(item.book_id, e.target.value)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => handleApprovedQtyKeyDown(e, item.book_id)}
                                    data-approved-qty={item.book_id}
                                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    placeholder="หมายเหตุ..."
                                    value={selectedBooks[item.book_id]?.notes || ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      updateNotes(item.book_id, e.target.value)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="bg-gray-50 px-4 py-3 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          เลือกแล้ว <span className="font-medium text-blue-600">{Object.keys(selectedBooks).length}</span> รายการ
                          จากทั้งหมด {availableBooks.length} รายการ
                        </p>
                        {Object.keys(selectedBooks).length > 0 && (
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              รวมขอเบิก: <span className="font-bold text-blue-600">{totalRequested}</span> เล่ม
                            </div>
                            <div>
                              รวมเบิกได้: <span className="font-bold text-green-600">{totalApproved}</span> เล่ม
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">ไม่พบหนังสือในคลังพัสดุ</p>
                    <p className="text-sm text-gray-400 mt-1">ชั้น {gradeLabel[selectedGrade]} ปีการศึกษา {new Date().getFullYear()}</p>
                    <p className="text-sm text-gray-400">กรุณาตรวจสอบการรับหนังสือและอัปเดต stock</p>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!loadingBooks && (!selectedTeacher || !selectedGrade) && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <User size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">กรุณาเลือกผู้เบิก, ผู้จ่ายพัสดุ และชั้นเรียน</p>
              </div>
            )}
            {!loadingBooks && selectedTeacher && selectedGrade && availableBooks.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">ไม่พบหนังสือในคลังพัสดุ</p>
                <p className="text-sm text-gray-400 mt-1">ชั้น {gradeLabel[selectedGrade]} ปีการศึกษา {new Date().getFullYear() + 543}</p>
                <p className="text-sm text-gray-400">กรุณาตรวจสอบการรับหนังสือและโอนไปสต๊อก</p>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewWithdrawalModal(false)
                  setSelectedTeacher('')
                  setSelectedOfficer('')
                  setSelectedGrade('')
                  setWithdrawalDate(new Date().toISOString().slice(0, 10))
                  setAvailableBooks([])
                  setSelectedBooks({})
                }}
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateNewWithdrawal}
                disabled={saving || Object.keys(selectedBooks).length === 0 || !selectedOfficer}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</>
                ) : (
                  <><Plus size={16} /> สร้างใบเบิก ({Object.keys(selectedBooks).length} รายการ)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Withdrawal Modal */}
      {showEditModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">แก้ไขใบเบิก</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">เลขที่:</span> <span className="font-medium">{selectedWithdrawal.withdrawal_number}</span></p>
              <p><span className="text-gray-500">วันที่เบิก:</span> <span className="font-medium">{selectedWithdrawal.withdrawal_date ? new Date(selectedWithdrawal.withdrawal_date).toLocaleDateString('th-TH') : '-'}</span></p>
              <p><span className="text-gray-500">ผู้เบิก:</span> <span className="font-medium">{selectedWithdrawal.requested_by_user?.full_name || selectedWithdrawal.orders?.users?.full_name || '-'}</span></p>
              <p><span className="text-gray-500">สถานะ:</span> {statusBadge(selectedWithdrawal.status)}</p>
            </div>

            {/* รายการหนังสือที่แก้ไขได้ */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="font-medium text-sm">รายการหนังสือ</h4>
              </div>

              {editingItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">รายการหนังสือ</th>
                        <th className="text-center px-3 py-2 w-28">จำนวนขอเบิก</th>
                        <th className="text-center px-3 py-2 w-28">จำนวนเบิกได้</th>
                        <th className="text-left px-3 py-2 w-48">หมายเหตุ</th>
                        <th className="text-center px-3 py-2 w-20">ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingItems.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-3">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <div className="font-medium">{item.book_title}</div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              value={item.requested_qty}
                              onChange={(e) => updateEditingItem(idx, 'requested_qty', Math.max(0, Number(e.target.value)))}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.requested_qty}
                              value={item.approved_qty}
                              onChange={(e) => updateEditingItem(idx, 'approved_qty', Math.max(0, Math.min(Number(e.target.value), item.requested_qty)))}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              placeholder="หมายเหตุ..."
                              value={item.notes}
                              onChange={(e) => updateEditingItem(idx, 'notes', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.id, idx)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="ลบรายการ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p>ไม่มีรายการหนังสือ</p>
                </div>
              )}

              {/* สรุปยอด */}
              {editingItems.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="flex items-center justify-end gap-4 text-sm">
                    <div>
                      รวมขอเบิก: <span className="font-bold text-blue-600">{editingItems.reduce((sum, item) => sum + (item.requested_qty || 0), 0)}</span> เล่ม
                    </div>
                    <div>
                      รวมเบิกได้: <span className="font-bold text-green-600">{editingItems.reduce((sum, item) => sum + (item.approved_qty || 0), 0)}</span> เล่ม
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingItems([])
                }}
                className="px-4 py-2 border rounded-xl text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateWithdrawal}
                disabled={saving || editingItems.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก...</>
                ) : (
                  <><Check size={16} /> บันทึกการแก้ไข</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
