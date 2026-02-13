import { useEffect, useState } from 'react'
import { fetchBudgetsByYear } from '@/services/budget.service'
import DonutChart from '@/components/dashboard/DonutChart'
import SummaryCard from '@/components/dashboard/SummaryCard'
import ExportPDFButton from '@/components/dashboard/ExportPDFButton'

export default function AdminDashboardPage() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetchBudgetsByYear(2026).then(setData)
  }, [])

  const sum = level =>
    data.filter(b => b.level === level)
        .reduce((s, b) => s + b.amount, 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold dark:text-white">Dashboard งบประมาณรายปี</h1>

      <SummaryCard
        title="งบประมาณรวมทั้งหมด"
        value={data.reduce((s, b) => s + b.amount, 0)}
      />

      <div id="dashboard-pdf" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DonutChart title="ปฐมวัย" used={sum('ปฐมวัย')} total={150000} />
        <DonutChart title="ประถมศึกษา" used={sum('ประถมศึกษา')} total={250000} />
        <DonutChart title="มัธยมศึกษา" used={sum('มัธยมศึกษา')} total={120000} />
      </div>

      <ExportPDFButton />
    </div>
  )
}
