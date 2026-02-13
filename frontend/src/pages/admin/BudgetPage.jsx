export default function BudgetPage() {
  const totalBudget = 5000000
  const usedBudget = 1200000
  const percent = Math.round((usedBudget / totalBudget) * 100)

  return (
    <div className="p-6">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-2 dark:text-white">การตั้งค่างบประมาณ</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        จัดการงบประมาณหนังสือเรียนประจำปีการศึกษา
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="งบประมาณทั้งหมด" value="5,000,000 บาท" />
        <Card title="ใช้ไปแล้ว" value="1,200,000 บาท" />
        <Card title="งบประมาณคงเหลือ" value="3,800,000 บาท" />
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
        <div className="flex justify-between mb-2">
          <span className="font-medium dark:text-white">การใช้งบประมาณ</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{percent}%</span>
        </div>

        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          ใช้ไป {usedBudget.toLocaleString()} จาก {totalBudget.toLocaleString()} บาท
        </div>
      </div>

      {/* Action */}
      <div className="mt-6 flex gap-4">
        <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          แก้ไขงบประมาณ
        </button>
        <button className="px-5 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200">
          ประวัติการใช้งบ
        </button>
      </div>
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-xl font-bold dark:text-white">{value}</p>
    </div>
  )
}