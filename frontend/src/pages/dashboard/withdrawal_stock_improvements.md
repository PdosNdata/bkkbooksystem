# ปรับปรุงการอัปเดต Book Stock ในใบเบิกพัสดุ

## สรุปปัญหาที่พบ

โค้ดปัจจุบันมีการอัปเดต `book_stock` แล้ว แต่มีประเด็นที่ควรปรับปรุง:

1. ✅ มีการลด `available_quantity` แล้ว
2. ✅ มีการเพิ่ม `distributed_quantity` แล้ว
3. ⚠️ แต่ขาดการตรวจสอบว่า stock เพียงพอหรือไม่
4. ⚠️ การแสดงผล error ไม่ละเอียด

## การปรับปรุง

### 1. เพิ่มการตรวจสอบ Stock เพียงพอหรือไม่

```javascript
// ตรวจสอบก่อนอัปเดต
if (stockData.available_quantity < item.approved) {
  stockUpdateErrors.push({
    bookId,
    error: `จำนวนคงเหลือไม่เพียงพอ (มี ${stockData.available_quantity} เบิก ${item.approved})`
  })
  console.warn(`Insufficient stock for book ${bookId}`)
  // ดำเนินการต่อแต่แจ้งเตือน
}
```

### 2. ปรับปรุงการแสดงผล Success/Error

แทนที่โค้ดในฟังก์ชัน `handleCreateNewWithdrawal` บรรทัดที่ 546-612:

```javascript
// อัปเดต book_stock: ลด available_quantity และเพิ่ม distributed_quantity
const currentYear = new Date().getFullYear()
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
        .eq('academic_year', currentYear.toString())
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
          // ดำเนินการต่อแต่แจ้งเตือน
        }

        // คำนวณจำนวนใหม่
        const newAvailable = Math.max(0, stockData.available_quantity - item.approved)
        const newDistributed = (stockData.distributed_quantity || 0) + item.approved

        // อัปเดต stock
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
          stockUpdateErrors.push({
            bookId,
            error: `อัปเดตไม่สำเร็จ: ${stockUpdateError.message}`
          })
        } else {
          stockUpdateSuccess.push({
            bookId,
            oldAvailable: stockData.available_quantity,
            newAvailable,
            oldDistributed: stockData.distributed_quantity || 0,
            newDistributed
          })
          console.log(`Stock updated for book ${bookId}: available ${stockData.available_quantity} → ${newAvailable}, distributed ${stockData.distributed_quantity || 0} → ${newDistributed}`)
        }
      } else {
        // ไม่พบ stock record
        stockUpdateErrors.push({
          bookId,
          error: `ไม่พบข้อมูล stock สำหรับชั้น ${selectedGrade} ปี ${currentYear}`
        })
        console.warn(`Stock record not found for book ${bookId}, grade ${selectedGrade}, year ${currentYear}`)
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
  // มี error บางรายการ
  const errorDetails = stockUpdateErrors
    .map(e => `- หนังสือ ID ${e.bookId}: ${e.error}`)
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
            <p class="text-sm font-medium text-yellow-800 mb-2">คำเตือน (${stockUpdateErrors.length} รายการ):</p>
            <div class="text-xs text-yellow-700">${errorDetails}</div>
          </div>
        ` : ''}
      </div>
    `,
    confirmButtonColor: '#2563eb',
    width: '600px'
  })
} else {
  // สำเร็จทั้งหมด
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
```

### 3. เพิ่มการจัดการเมื่อแก้ไขใบเบิก (ถ้าต้องการ)

ปัจจุบันฟังก์ชัน `handleUpdateWithdrawal` ยังไม่มีการอัปเดต stock ถ้าต้องการให้แก้ไขจำนวนเบิกแล้วอัปเดต stock ด้วย ให้เพิ่มโค้ดนี้:

```javascript
const handleUpdateWithdrawal = async () => {
  if (!selectedWithdrawal) return
  setSaving(true)

  try {
    // คำนวณการเปลี่ยนแปลง
    const oldItems = selectedWithdrawal.withdrawal_items || []
    const changes = []
    
    editingItems.forEach(newItem => {
      const oldItem = oldItems.find(o => o.id === newItem.id)
      if (oldItem && oldItem.approved_qty !== newItem.approved_qty) {
        changes.push({
          book_id: newItem.book_id,
          oldQty: oldItem.approved_qty,
          newQty: newItem.approved_qty,
          diff: newItem.approved_qty - oldItem.approved_qty
        })
      }
    })

    // อัปเดต stock ตามการเปลี่ยนแปลง
    const currentYear = new Date().getFullYear()
    for (const change of changes) {
      const { data: stockData } = await supabase
        .from('book_stock')
        .select('id, available_quantity, distributed_quantity')
        .eq('book_id', change.book_id)
        .eq('grade', selectedWithdrawal.orders?.grade)
        .eq('academic_year', currentYear.toString())
        .maybeSingle()

      if (stockData) {
        const newAvailable = stockData.available_quantity - change.diff
        const newDistributed = stockData.distributed_quantity + change.diff

        await supabase
          .from('book_stock')
          .update({
            available_quantity: Math.max(0, newAvailable),
            distributed_quantity: newDistributed,
            updated_at: new Date().toISOString()
          })
          .eq('id', stockData.id)
      }
    }

    // ส่วนที่เหลือของการอัปเดต...
    const totalRequested = editingItems.reduce((sum, item) => sum + (item.requested_qty || 0), 0)
    const totalApproved = editingItems.reduce((sum, item) => sum + (item.approved_qty || 0), 0)

    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({
        total_requested: totalRequested,
        total_approved: totalApproved,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedWithdrawal.id)

    if (updateError) throw updateError

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

    Swal.fire({ 
      icon: 'success', 
      title: 'แก้ไขใบเบิกสำเร็จ', 
      timer: 1500, 
      showConfirmButton: false 
    })
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
```

### 4. เพิ่มการจัดการเมื่อลบรายการ

ปรับปรุงฟังก์ชัน `handleDeleteItem` ให้คืน stock:

```javascript
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
      const { data: stockData } = await supabase
        .from('book_stock')
        .select('id, available_quantity, distributed_quantity')
        .eq('book_id', item.book_id)
        .eq('grade', selectedWithdrawal.orders?.grade)
        .eq('academic_year', currentYear.toString())
        .maybeSingle()

      if (stockData) {
        await supabase
          .from('book_stock')
          .update({
            available_quantity: stockData.available_quantity + item.approved_qty,
            distributed_quantity: Math.max(0, stockData.distributed_quantity - item.approved_qty),
            updated_at: new Date().toISOString()
          })
          .eq('id', stockData.id)
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
      timer: 1200, 
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
```

## สรุป

### การทำงานที่มีอยู่แล้ว ✅
- ลด `available_quantity` เมื่อสร้างใบเบิก
- เพิ่ม `distributed_quantity` เมื่อสร้างใบเบิก

### การปรับปรุงเพิ่มเติม 🔧
1. ตรวจสอบ stock ว่าเพียงพอหรือไม่ก่อนเบิก
2. แสดงผล error/warning ละเอียดขึ้น
3. เพิ่มการอัปเดต stock เมื่อแก้ไขใบเบิก (optional)
4. คืน stock เมื่อลบรายการ (optional)

### การใช้งาน
1. แทนที่โค้ดในฟังก์ชัน `handleCreateNewWithdrawal` ที่บรรทัด 546-612
2. (Optional) เพิ่มการจัดการ stock ในฟังก์ชัน `handleUpdateWithdrawal`
3. (Optional) เพิ่มการคืน stock ในฟังก์ชัน `handleDeleteItem`

## หมายเหตุสำคัญ

- โค้ดเดิมทำงานถูกต้องแล้ว แต่ขาดการตรวจสอบและแสดงผลที่ละเอียด
- การปรับปรุงนี้จะช่วยให้ระบบแข็งแรงและแจ้งเตือนชัดเจนขึ้น
- หาก stock ไม่เพียงพอ ระบบจะยังคงสร้างใบเบิกได้ แต่จะแจ้งเตือนผู้ใช้
