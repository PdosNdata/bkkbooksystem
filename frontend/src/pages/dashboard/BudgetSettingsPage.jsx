import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Wallet, Loader2, Save, Users, Calculator } from 'lucide-react'
import Swal from 'sweetalert2'

const gradeLabel = { kg2: 'อนุบาล 2', kg3: 'อนุบาล 3', p1: 'ป.1', p2: 'ป.2', p3: 'ป.3', p4: 'ป.4', p5: 'ป.5', p6: 'ป.6', m1: 'ม.1', m2: 'ม.2', m3: 'ม.3' }
const levelLabel = { kindergarten: 'อนุบาล', primary: 'ประถมศึกษา', secondary: 'มัธยมศึกษา' }
const gradesByLevel = {
  kindergarten: ['kg2', 'kg3'],
  primary: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
  secondary: ['m1', 'm2', 'm3'],
}

export default function BudgetSettingsPage() {
  const [budgets, setBudgets] = useState({}) // { grade: { id, amount, used_amount } }
  const [studentCounts, setStudentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543)
  // perHead state แยกต่างหาก เพื่อให้กรอก per_head แล้วคำนวณ amount ได้
  const [perHeads, setPerHeads] = useState({})
  const [amounts, setAmounts] = useState({})

  useEffect(() => { fetchData() }, [selectedYear])

  const fetchData = async () => {
    setLoading(true)
    const [budgetRes, studentRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('year', selectedYear).order('grade', { ascending: true }),
      supabase.from('students').select('grade')
    ])

    // จัดเก็บ budgets เป็น map by grade
    const budgetMap = {}
    const amountMap = {}
    const perHeadMap = {}
    ;(budgetRes.data || []).forEach(b => {
      budgetMap[b.grade] = b
      amountMap[b.grade] = Number(b.amount || 0)
    })

    // นับจำนวนนักเรียนแต่ละชั้น
    const counts = {}
    ;(studentRes.data || []).forEach(s => {
      counts[s.grade] = (counts[s.grade] || 0) + 1
    })

    // คำนวณ per_head จาก amount / count
    Object.keys(amountMap).forEach(grade => {
      const count = counts[grade] || 0
      perHeadMap[grade] = count > 0 ? Math.round(amountMap[grade] / count) : 0
    })

    setBudgets(budgetMap)
    setStudentCounts(counts)
    setAmounts(amountMap)
    setPerHeads(perHeadMap)
    setLoading(false)
  }

  const handlePerHeadChange = (grade, value) => {
    const val = Number(value) || 0
    const count = studentCounts[grade] || 0
    setPerHeads(p => ({ ...p, [grade]: val }))
    setAmounts(p => ({ ...p, [grade]: count > 0 ? val * count : val }))
  }

  const handleAmountChange = (grade, value) => {
    const val = Number(value) || 0
    const count = studentCounts[grade] || 0
    setAmounts(p => ({ ...p, [grade]: val }))
    setPerHeads(p => ({ ...p, [grade]: count > 0 ? Math.round(val / count) : 0 }))
  }

  // บันทึกทั้งหมดทุกชั้น
  const handleSaveAll = async () => {
    setSaving(true)
    const allGrades = [...gradesByLevel.kindergarten, ...gradesByLevel.primary, ...gradesByLevel.secondary]
    const errors = []

    for (const grade of allGrades) {
      const amount = amounts[grade] || 0
      if (amount <= 0 && !budgets[grade]) continue // ข้ามถ้ายังไม่มีข้อมูลและไม่ได้กรอก

      const level = gradesByLevel.kindergarten.includes(grade) ? 'kindergarten'
        : gradesByLevel.primary.includes(grade) ? 'primary' : 'secondary'

      if (budgets[grade]) {
        // update
        const { error } = await supabase.from('budgets')
          .update({ amount })
          .eq('id', budgets[grade].id)
        if (error) errors.push(`${gradeLabel[grade]}: ${error.message}`)
      } else if (amount > 0) {
        // insert
        const { error } = await supabase.from('budgets')
          .insert({ year: selectedYear, level, grade, amount })
        if (error) errors.push(`${gradeLabel[grade]}: ${error.message}`)
      }
    }

    setSaving(false)
    if (errors.length > 0) {
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จบางรายการ', html: errors.join('<br>') })
    } else {
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1200, showConfirmButton: false })
    }
    fetchData()
  }

  // บันทึกทีละชั้น
  const handleSaveGrade = async (grade) => {
    const amount = amounts[grade] || 0
    const level = gradesByLevel.kindergarten.includes(grade) ? 'kindergarten'
      : gradesByLevel.primary.includes(grade) ? 'primary' : 'secondary'

    if (budgets[grade]) {
      const { error } = await supabase.from('budgets').update({ amount }).eq('id', budgets[grade].id)
      if (error) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message }); return }
    } else if (amount > 0) {
      const { error } = await supabase.from('budgets').insert({ year: selectedYear, level, grade, amount })
      if (error) { Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message }); return }
    }
    Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1000, showConfirmButton: false })
    fetchData()
  }

  const totalBudget = Object.values(amounts).reduce((sum, a) => sum + (a || 0), 0)
  const totalUsed = Object.values(budgets).reduce((sum, b) => sum + Number(b?.used_amount || 0), 0)
  const totalStudents = Object.values(studentCounts).reduce((sum, c) => sum + c, 0)
  const usedPct = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32} /><span className="ml-3 text-gray-500 dark:text-gray-400">กำลังโหลด...</span></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">การตั้งค่างบประมาณ</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">กำหนดงบประมาณรายชั้นเรียน (กรอกงบรายหัวหรืองบรวมได้)</p>
        </div>
        <div className="flex gap-3">
          <select className="border dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-200" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[0, -1, -2, 1].map(d => { const y = new Date().getFullYear() + 543 + d; return <option key={y} value={y}>{y}</option> })}
          </select>
          <button onClick={handleSaveAll} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} บันทึกทั้งหมด
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">งบประมาณทั้งหมด</p>
          <p className="text-2xl font-bold mt-1 dark:text-white">{totalBudget.toLocaleString()} บาท</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">ใช้ไปแล้ว</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalUsed.toLocaleString()} บาท</p>
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{usedPct}% ของงบประมาณ</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">คงเหลือ</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{(totalBudget - totalUsed).toLocaleString()} บาท</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">นักเรียนทั้งหมด</p>
          </div>
          <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{totalStudents.toLocaleString()} คน</p>
          {totalStudents > 0 && totalBudget > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">เฉลี่ย {Math.round(totalBudget / totalStudents).toLocaleString()} บาท/คน</p>
          )}
        </div>
      </div>

      {/* Budget by Level - แสดงทุกชั้นให้กรอกได้เลย */}
      {Object.entries(gradesByLevel).map(([level, grades]) => {
        const levelStudents = grades.reduce((sum, g) => sum + (studentCounts[g] || 0), 0)
        const levelBudget = grades.reduce((sum, g) => sum + (amounts[g] || 0), 0)
        const levelUsed = grades.reduce((sum, g) => sum + Number(budgets[g]?.used_amount || 0), 0)

        return (
          <div key={level} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white">
                <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
                {levelLabel[level]}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Users size={14} /> {levelStudents} คน</span>
                <span>รวม {levelBudget.toLocaleString()} บาท</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="text-left px-4 py-3 font-medium w-28 dark:text-gray-200">ระดับชั้น</th>
                    <th className="text-center px-4 py-3 font-medium w-24 dark:text-gray-200">นักเรียน</th>
                    <th className="text-center px-4 py-3 font-medium w-40 dark:text-gray-200">
                      <span className="flex items-center justify-center gap-1"><Calculator size={13} /> งบ/คน (บาท)</span>
                    </th>
                    <th className="text-center px-4 py-3 font-medium w-44 dark:text-gray-200">งบประมาณรวม (บาท)</th>
                    <th className="text-right px-4 py-3 font-medium w-28 dark:text-gray-200">ใช้ไปแล้ว</th>
                    <th className="text-right px-4 py-3 font-medium w-28 dark:text-gray-200">คงเหลือ</th>
                    <th className="text-center px-4 py-3 font-medium w-20 dark:text-gray-200">บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {grades.map(grade => {
                    const count = studentCounts[grade] || 0
                    const amount = amounts[grade] || 0
                    const used = Number(budgets[grade]?.used_amount || 0)
                    const remaining = amount - used

                    return (
                      <tr key={grade} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 font-medium dark:text-gray-200">{gradeLabel[grade]}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                            <Users size={13} /> {count}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="w-full text-center border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                            placeholder="0"
                            value={perHeads[grade] || ''}
                            onChange={e => handlePerHeadChange(grade, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            className="w-full text-center border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200"
                            placeholder="0"
                            value={amount || ''}
                            onChange={e => handleAmountChange(grade, e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{used.toLocaleString()} บาท</td>
                        <td className={`px-4 py-3 text-right font-medium ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {remaining.toLocaleString()} บาท
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleSaveGrade(grade)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            title="บันทึก"
                          >
                            <Save size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {/* แถวรวม */}
                  <tr className="bg-blue-50 dark:bg-blue-900/30 font-medium dark:text-gray-200">
                    <td className="px-4 py-3">รวม {levelLabel[level]}</td>
                    <td className="px-4 py-3 text-center text-purple-600 dark:text-purple-400">{levelStudents} คน</td>
                    <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400">
                      {levelStudents > 0 ? `${Math.round(levelBudget / levelStudents).toLocaleString()} บาท` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">{levelBudget.toLocaleString()} บาท</td>
                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{levelUsed.toLocaleString()} บาท</td>
                    <td className={`px-4 py-3 text-right ${(levelBudget - levelUsed) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(levelBudget - levelUsed).toLocaleString()} บาท
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
