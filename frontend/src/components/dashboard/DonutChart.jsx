import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DonutChart({ title, used, total }) {
  const percent = total > 0 ? Math.round((used / total) * 100) : 0
  const over = used > total
  const remain = Math.max(total - used, 0)

  const data = {
    labels: ['ใช้แล้ว', 'คงเหลือ'],
    datasets: [
      {
        data: [used, remain],
        backgroundColor: over
          ? ['#dc2626', '#fee2e2']
          : ['#2563eb', '#e5e7eb'],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom' },
    },
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <h3 className="font-semibold text-center mb-2 dark:text-white">{title}</h3>

      <Doughnut data={data} options={options} />

      <div className="mt-3 text-center text-sm dark:text-gray-200">
        <p>
          ใช้ไป <b>{used.toLocaleString()}</b> / {total.toLocaleString()} บาท
        </p>
        <p className={over ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
          {percent}% {over && '🚨 เกินงบ'}
        </p>
      </div>
    </div>
  )
}
