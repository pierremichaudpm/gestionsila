import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import { useAuth } from '../lib/AuthProvider.jsx'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, taskPriority, taskStatus, toneClass } from '../lib/format'
import { useTaskFilters, uniqueValues } from '../components/taches/useTaskFilters'
import TasksKanbanView from '../components/taches/TasksKanbanView.jsx'
import TasksTableView from '../components/taches/TasksTableView.jsx'
import TaskDetailPanel from '../components/taches/TaskDetailPanel.jsx'
import NewTaskModal from '../components/taches/NewTaskModal.jsx'

const TASK_SELECT = `
  *,
  lot:lots(id, name, country),
  assignee:users!tasks_assigned_to_fkey(id, full_name),
  milestone:milestones!tasks_milestone_id_fkey(id, title)
`

export default function Taches() {
  const { projectId, accessLevel } = useCurrentProject()
  const { profile } = useAuth()

  const [tasks,      setTasks]      = useState([])
  const [lots,       setLots]       = useState([])
  const [members,    setMembers]    = useState([])
  const [milestones, setMilestones] = useState([])
  const [commentCounts, setCommentCounts] = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // UI state
  const [view,            setView]            = useState('kanban')    // 'kanban' | 'table'
  const [showNewModal,    setShowNewModal]     = useState(false)
  const [newModalStatus,  setNewModalStatus]   = useState('todo')
  const [detailTask,      setDetailTask]       = useState(null)
  const [showArchive,     setShowArchive]      = useState(false)

  const activeTasks   = tasks.filter(t => !t.archived)
  const archivedTasks = tasks.filter(t =>  t.archived)

  const { filters, filtered, setFilter, resetFilters, activeCount } = useTaskFilters(activeTasks)

  // Load everything on mount
  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const [tasksRes, lotsRes, membersRes, milestonesRes] = await Promise.all([
        supabase
          .from('tasks')
          .select(TASK_SELECT)
          .eq('project_id', projectId)
          .order('position', { ascending: true }),

        supabase
          .from('lots')
          .select('id, name, country')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),

        supabase
          .from('project_members')
          .select('user:users(id, full_name)')
          .eq('project_id', projectId),

        supabase
          .from('milestones')
          .select('id, title')
          .eq('project_id', projectId)
          .eq('archived', false)
          .order('start_date', { ascending: true }),
      ])

      if (!alive) return

      const firstError = tasksRes.error ?? lotsRes.error ?? membersRes.error ?? milestonesRes.error
      if (firstError) { setError(firstError); setLoading(false); return }

      setTasks(tasksRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setMembers(
        (membersRes.data ?? [])
          .map(m => m.user)
          .filter(Boolean)
          .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
      )
      setMilestones(milestonesRes.data ?? [])
      setLoading(false)

      // Compteurs commentaires (best-effort, non bloquant)
      loadCommentCounts(tasksRes.data ?? [], projectId, alive)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  async function loadCommentCounts(taskList, pid, alive) {
    if (!taskList.length) return
    const { data } = await supabase
      .from('comments')
      .select('entity_id')
      .eq('project_id', pid)
      .eq('entity_type', 'task')
      .in('entity_id', taskList.map(t => t.id))
    if (!alive || !data) return
    const counts = {}
    data.forEach(c => { counts[c.entity_id] = (counts[c.entity_id] ?? 0) + 1 })
    setCommentCounts(counts)
  }

  // Mise à jour d'une tâche (retour Kanban DnD ou inline)
  const handleTaskUpdate = useCallback(async (id, fields) => {
    // Optimistic local update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t))

    const { data, error: err } = await supabase
      .from('tasks')
      .update(fields)
      .eq('id', id)
      .select(TASK_SELECT)
      .single()

    if (err) {
      // Rollback — recharger depuis Supabase
      const { data: fresh } = await supabase.from('tasks').select(TASK_SELECT).eq('project_id', projectId)
      if (fresh) setTasks(fresh)
      throw err
    }
    setTasks(prev => prev.map(t => t.id === id ? data : t))
    // Sync détail si ouvert
    if (detailTask?.id === id) setDetailTask(data)
    return data
  }, [projectId, detailTask])

  function handleCreated(task) {
    setTasks(prev => [...prev, task])
  }

  function handleSaved(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setDetailTask(updated)
  }

  function handleDeleted(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (detailTask?.id === id) setDetailTask(null)
  }

  function openDetail(task) {
    setDetailTask(task)
  }

  function openNewModal(status = 'todo') {
    setNewModalStatus(status)
    setShowNewModal(true)
  }

  // Valeurs uniques pour les filtres champs libres
  const phases = uniqueValues(activeTasks, 'phase')
  const actes  = uniqueValues(activeTasks, 'acte')

  const isAdmin = accessLevel === 'admin'

  if (!projectId || loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[color:var(--color-brand-navy)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm">
        <p className="font-medium text-red-700">Impossible de charger les tâches.</p>
        <p className="mt-1 text-red-600">{error.message ?? String(error)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[color:var(--color-brand-navy)]">Tâches</h1>
        <div className="flex items-center gap-2">
          {/* Toggle Kanban / Table */}
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-[color:var(--color-brand-navy)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'table' ? 'bg-[color:var(--color-brand-navy)] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Table
            </button>
          </div>
          <button
            type="button"
            onClick={() => openNewModal()}
            className="flex items-center gap-1.5 rounded-lg bg-[color:var(--color-brand-navy)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--color-brand-blue)] transition"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Bandeau de filtres */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        {/* Tableau */}
        <FilterSelect
          label="Tableau"
          value={filters.lot}
          onChange={v => setFilter('lot', v)}
          options={[
            { value: 'transversal', label: 'Transversal' },
            ...lots.map(l => ({ value: l.id, label: l.name })),
          ]}
          allLabel="Tous les tableaux"
        />

        {/* Phase */}
        {phases.length > 0 ? (
          <FilterSelect
            label="Phase"
            value={filters.phase}
            onChange={v => setFilter('phase', v)}
            options={phases.map(p => ({ value: p, label: p }))}
            allLabel="Toutes les phases"
          />
        ) : null}

        {/* Acte */}
        {actes.length > 0 ? (
          <FilterSelect
            label="Acte"
            value={filters.acte}
            onChange={v => setFilter('acte', v)}
            options={actes.map(a => ({ value: a, label: a }))}
            allLabel="Tous les actes"
          />
        ) : null}

        {/* Responsable */}
        <FilterSelect
          label="Responsable"
          value={filters.assignee}
          onChange={v => setFilter('assignee', v)}
          options={[
            { value: 'unassigned', label: 'Non assigné' },
            ...members.map(m => ({ value: m.id, label: m.full_name })),
          ]}
          allLabel="Tous"
        />

        {/* Priorité */}
        <FilterSelect
          label="Priorité"
          value={filters.priority}
          onChange={v => setFilter('priority', v)}
          options={TASK_PRIORITY_OPTIONS.map(p => ({ value: p, label: taskPriority(p).label }))}
          allLabel="Toutes"
        />

        {/* Statut */}
        <FilterSelect
          label="Statut"
          value={filters.status}
          onChange={v => setFilter('status', v)}
          options={TASK_STATUS_OPTIONS.map(s => ({ value: s, label: taskStatus(s).label }))}
          allLabel="Tous"
        />

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto self-end rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            Réinitialiser ({activeCount})
          </button>
        ) : null}
      </div>

      {/* Compteur */}
      <div className="flex items-baseline gap-2 text-xs text-slate-500">
        <span>{filtered.length} tâche{filtered.length > 1 ? 's' : ''}</span>
        {activeCount > 0 ? <span className="text-slate-400">(filtrées sur {activeTasks.length})</span> : null}
      </div>

      {/* Vue active */}
      {view === 'kanban' ? (
        <TasksKanbanView
          tasks={filtered}
          commentCounts={commentCounts}
          onTaskUpdate={handleTaskUpdate}
          onAddTask={openNewModal}
          onOpenDetail={openDetail}
        />
      ) : (
        <TasksTableView
          tasks={filtered}
          commentCounts={commentCounts}
          onOpenDetail={openDetail}
        />
      )}

      {/* Section Archive */}
      {archivedTasks.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowArchive(v => !v)}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform ${showArchive ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Archive ({archivedTasks.length} tâche{archivedTasks.length > 1 ? 's' : ''})
          </button>

          {showArchive ? (
            <div className="mt-3 opacity-60">
              <TasksTableView
                tasks={archivedTasks}
                commentCounts={commentCounts}
                onOpenDetail={openDetail}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Modals */}
      <NewTaskModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        projectId={projectId}
        lots={lots}
        members={members}
        defaultStatus={newModalStatus}
        onCreated={handleCreated}
      />

      <TaskDetailPanel
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        projectId={projectId}
        lots={lots}
        members={members}
        milestones={milestones}
        allTasks={activeTasks}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  )
}

// Composant filtre réutilisable
function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[color:var(--color-brand-blue)] focus:outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
