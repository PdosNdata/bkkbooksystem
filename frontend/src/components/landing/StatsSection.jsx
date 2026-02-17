const stats = [
  { label: 'คุณครู', value: '10+' },
  { label: 'รายการหนังสือ', value: '5,000+' },
  { label: 'นักเรียนได้รับประโยชน์', value: '250K+' },
  { label: 'หนังสือที่จัดส่งแล้ว', value: '2.5M+' },
]

export default function StatsSection() {
  return (
    <section className="bg-gray-50 dark:bg-gray-800 py-14">
      <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-6 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{s.value}</p>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}