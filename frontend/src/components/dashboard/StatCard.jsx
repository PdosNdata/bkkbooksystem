export default function StatCard({ title, value, note }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-2 dark:text-white">{title}</h3>
      <p className="text-2xl font-bold dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{note}</p>
    </div>
  )
}