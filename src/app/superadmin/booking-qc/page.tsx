"use client"
import { useEffect, useMemo, useState } from 'react'

interface TeamOption {
  id: string
  name: string
  teamNumber: string
}

interface CheckResult {
  key: string
  title: string
  status: 'pass' | 'fail' | 'warn'
  details?: string
}

export default function SuperadminBookingQCPage() {
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [useSample, setUseSample] = useState(false)

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/superadmin/teams?page=1&pageSize=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Не удалось получить список команд')
        const data = await res.json()
        setTeams((data.teams || []).map((t: any) => ({ id: t.id, name: t.name, teamNumber: t.teamNumber })))
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки команд')
      }
    }
    loadTeams()
  }, [])

  const handleRun = async () => {
    setIsLoading(true)
    setError('')
    setResults(null)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (!useSample && selectedTeamId) params.set('teamId', selectedTeamId)
      if (useSample) params.set('sample', '1')
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/superadmin/booking-qc/run?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось выполнить проверки')
      setResults(data.checks || [])
    } catch (e: any) {
      setError(e?.message || 'Ошибка запуска проверок')
    } finally {
      setIsLoading(false)
    }
  }

  const runButtonDisabled = useMemo(() => {
    if (useSample) return false
    return !selectedTeamId
  }, [useSample, selectedTeamId])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Проверка бронирования</h1>

      {error && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm text-gray-700 mb-1">Команда</label>
            <select
              disabled={useSample}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[40px] focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">— Выберите команду —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.teamNumber})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <input id="useSample" type="checkbox" checked={useSample} onChange={(e) => setUseSample(e.target.checked)} />
            <label htmlFor="useSample" className="text-sm text-gray-700">Эталонная команда (qa-sample)</label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">С даты</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[40px] focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">По дату</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[40px] focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRun}
            disabled={isLoading || runButtonDisabled}
            className={`px-4 py-2 rounded-md text-white ${isLoading || runButtonDisabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? 'Запуск...' : 'Тестировать'}
          </button>

          <button
            onClick={async () => {
              setError('')
              try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/superadmin/booking-qc/seed', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
                const data = await res.json()
                if (!res.ok) throw new Error(data?.error || 'Не удалось создать эталонную команду')
                alert('Эталонная команда подготовлена')
              } catch (e: any) {
                setError(e?.message || 'Ошибка подготовки эталонной команды')
              }
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Создать/обновить эталонную
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Результаты</h2>
        {!results && (
          <div className="text-sm text-gray-500">Нажмите “Тестировать”, чтобы запустить проверки.</div>
        )}
        {results && (
          <ul className="divide-y divide-gray-100">
            {results.map((c) => (
              <li key={c.key} className="py-2 flex items-start gap-3">
                <span
                  className={
                    c.status === 'pass' ? 'inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800' :
                    c.status === 'warn' ? 'inline-flex px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800' :
                    'inline-flex px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800'
                  }
                >
                  {c.status.toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.title}</div>
                  {c.details && <div className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{c.details}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


