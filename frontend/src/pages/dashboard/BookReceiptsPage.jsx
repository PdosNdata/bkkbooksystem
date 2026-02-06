import { useState } from 'react'

export default function BookReceiptsPage() {
  const [count, setCount] = useState(0)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">รับหนังสือจากสำนักพิมพ์</h1>
      <p>ทดสอบ: {count}</p>
      <button
        onClick={() => setCount(c => c + 1)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        เพิ่ม
      </button>
    </div>
  )
}
