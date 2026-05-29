import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import { countryFlag, countryName, COUNTRY_OPTIONS } from '../lib/format'
import GanttView from '../components/calendrier/GanttView.jsx'
import TaskDetailPanel from '../components/taches/TaskDetailPanel.jsx'

// Même forme de chargement que la page Tâches : le panneau de détail
// (TaskDetailPanel) attend l'objet tâche complet.
const TASK_SELECT = `
  *,
  lot:lots(id, name, country),
  assignee:users!tasks_assigned_to_fkey(id, full_name),
  milestone:milestones!tasks_milestone_id_fkey(id, title)
`

export default function Planning() {
  const { projectId, loading: projectLoading } = useCurrentProject()

  const [tasks, setTasks] = useState([])
  const [periods, setPeriods] = useState([])
  const [lots, setLots] = useState([])
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [filters, setFilters] = useState({ section: 'all', responsable: 'all', country: 'all' })
  const [detailTask, setDetailTask] = useState(null)
  const [showGantt, setShowGantt] = useState(true)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const [tasksRes, periodsRes, lotsRes, membersRes, milestonesRes] = await Promise.all([
        supabase.from('tasks').select(TASK_SELECT).eq('project_id', projectId).order('position', { ascending: true }),
        supabase
          .from('task_periods')
          .select('id, task_id, start_date, end_date, is_tentative, note, task:tasks!inner(project_id)')
          .eq('task.project_id', projectId),
        supabase.from('lots').select('id, name, country').eq('project_id', projectId).order('sort_order', { ascending: true }),
        supabase.from('project_members').select('user:users(id, full_name)').eq('project_id', projectId),
        supabase.from('milestones').select('id, title').eq('project_id', projectId).eq('archived', false).order('start_date', { ascending: true }),
      ])

      if (!alive) return
      const firstError = tasksRes.error ?? periodsRes.error ?? lotsRes.error ?? membersRes.error ?? milestonesRes.error
      if (firstError) { setError(firstError); setLoading(false); return }

      setTasks(tasksRes.data ?? [])
      setPeriods(periodsRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setMembers(
        (membersRes.data ?? []).map(m => m.user).filter(Boolean)
          .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
      )
      setMilestones(milestonesRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks])

  // Périodes groupées par tâche.
  const periodsByTask = useMemo(() => {
    const map = new Map()
    for (const p of periods) {
      if (!map.has(p.task_id)) map.set(p.task_id, [])
      map.get(p.task_id).push({
        startDate: p.start_date,
        endDate: p.end_date,
        isTentative: p.is_tentative === true,
        note: p.note,
      })
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
    }
    return map
  }, [periods])

  // Items Gantt : une tâche active ayant ≥ 1 période.
  const items = useMemo(() => {
    return activeTasks.map(t => {
      const ps = periodsByTask.get(t.id) ?? []
      if (ps.length === 0) return null
      const startDate = ps[0].startDate
      const endDate = ps.reduce((max, p) => {
        const e = p.endDate ?? p.startDate
        return e > max ? e : max
      }, ps[0].endDate ?? ps[0].startDate)
      return {
        id: `task-${t.id}`,
        taskId: t.id,
        source: 'task',
        title: t.title,
        lotId: t.lot_id ?? null,
        country: t.country ?? null,
        responsable: t.assignee?.full_name ?? t.responsable_label ?? null,
        status: t.status,
        archived: t.archived === true,
        context: t.lot?.name ?? null,
        startDate,
        endDate,
        periods: ps,
      }
    }).filter(Boolean)
  }, [activeTasks, periodsByTask])

  const responsableOptions = useMemo(() => {
    const set = new Set()
    for (const it of items) if (it.responsable) set.add(it.responsable)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (filters.section !== 'all' && it.lotId !== filters.section) return false
      if (filters.responsable !== 'all' && it.responsable !== filters.responsable) return false
      if (filters.country !== 'all') {
        if (filters.country === 'transversal' && it.country) return false
        if (filters.country !== 'transversal' && it.country !== filters.country) return false
      }
      return true
    })
  }, [items, filters])

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const tasksWithoutPeriods = activeTasks.length - items.length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Planning</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gantt de production par tableau — tâches et leurs périodes de travail.
          </p>
        </div>
      </header>

      <Filters
        filters={filters}
        onChange={updateFilter}
        lots={lots}
        responsables={responsableOptions}
      />

      {projectLoading || loading ? (
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-medium">Impossible de charger le planning.</p>
          <p className="mt-1 text-red-600">{error.message}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Aucune tâche planifiée.</p>
          <p className="mt-1">
            Le planning affiche les tâches qui ont au moins une période de travail. Importez
            le planning (migration de seed) ou ajoutez des périodes aux tâches.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden space-y-3 md:block">
            <button
              type="button"
              onClick={() => setShowGantt(s => !s)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-brand-navy shadow-sm transition hover:border-brand-blue"
            >
              <span>Vue Gantt — Planning par tableau</span>
              <span className="text-xs font-medium text-slate-500">{showGantt ? 'Masquer ▾' : 'Afficher ▸'}</span>
            </button>
            {showGantt ? (
              <GanttView
                items={filtered}
                lots={lots}
                groupBy="lot"
                onTaskClick={(taskId) => {
                  const t = tasks.find(x => x.id === taskId)
                  if (t) setDetailTask(t)
                }}
              />
            ) : null}
          </div>
          <div className="block rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500 md:hidden">
            La vue Gantt est disponible sur écran large (≥ 768 px).
          </div>

          {tasksWithoutPeriods > 0 ? (
            <p className="text-[11px] text-slate-400">
              {tasksWithoutPeriods} tâche{tasksWithoutPeriods > 1 ? 's' : ''} sans période de travail —
              non affichée{tasksWithoutPeriods > 1 ? 's' : ''} dans le Gantt (visible{tasksWithoutPeriods > 1 ? 's' : ''} dans Tâches).
            </p>
          ) : null}
        </>
      )}

      <TaskDetailPanel
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        projectId={projectId}
        lots={lots}
        members={members}
        milestones={milestones}
        allTasks={activeTasks}
        onSaved={() => { setDetailTask(null); setReloadKey(k => k + 1) }}
        onDeleted={() => { setDetailTask(null); setReloadKey(k => k + 1) }}
      />
    </div>
  )
}

function Filters({ filters, onChange, lots, responsables }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <FilterSelect label="Tableau" value={filters.section} onChange={(v) => onChange('section', v)}>
        <option value="all">Tous</option>
        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Responsable" value={filters.responsable} onChange={(v) => onChange('responsable', v)}>
        <option value="all">Tous</option>
        {responsables.map(r => <option key={r} value={r}>{r}</option>)}
      </FilterSelect>
      <FilterSelect label="Pays" value={filters.country} onChange={(v) => onChange('country', v)}>
        <option value="all">Tous</option>
        <option value="transversal">Transversal (sans pays)</option>
        {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>)}
      </FilterSelect>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {children}
      </select>
    </label>
  )
}
