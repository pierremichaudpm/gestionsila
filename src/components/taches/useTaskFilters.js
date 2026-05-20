import { useMemo, useState } from 'react'

const EMPTY = {
  lot:        '',
  phase:      '',
  acte:       '',
  assignee:   '',
  priority:   '',
  status:     '',
}

export function useTaskFilters(tasks) {
  const [filters, setFilters] = useState(EMPTY)

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(EMPTY)
  }

  const filtered = useMemo(() => {
    return tasks.filter(task => {
      if (filters.lot && (task.lot_id ?? 'transversal') !== filters.lot) return false
      if (filters.phase && task.phase !== filters.phase) return false
      if (filters.acte && task.acte !== filters.acte) return false
      if (filters.assignee === 'unassigned' && task.assigned_to !== null) return false
      if (filters.assignee && filters.assignee !== 'unassigned' && task.assigned_to !== filters.assignee) return false
      if (filters.priority && task.priority !== filters.priority) return false
      if (filters.status && task.status !== filters.status) return false
      return true
    })
  }, [tasks, filters])

  const activeCount = Object.values(filters).filter(Boolean).length

  return { filters, filtered, setFilter, resetFilters, activeCount }
}

// Extrait les valeurs uniques d'un champ texte libre (phase, acte, discipline…)
// pour alimenter un select de filtre.
export function uniqueValues(tasks, field) {
  const seen = new Set()
  tasks.forEach(t => {
    const v = t[field]
    if (v) seen.add(v)
  })
  return [...seen].sort()
}
