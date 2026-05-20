import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import TaskCard, { TaskCardOverlay } from './TaskCard'

const COLUMNS = [
  { id: 'todo',        label: 'À faire',  headerClass: 'text-slate-600 bg-slate-50 border-slate-200' },
  { id: 'in_progress', label: 'En cours', headerClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'blocked',     label: 'Bloqué',   headerClass: 'text-red-700 bg-red-50 border-red-200' },
  { id: 'done',        label: 'Terminé',  headerClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'validated',   label: 'Validé',   headerClass: 'text-green-700 bg-green-50 border-green-200' },
]

// Calcule la nouvelle position pour un item inséré à l'index `idx`
// dans un tableau trié de tasks.
function computePosition(sortedTasks, idx) {
  if (sortedTasks.length === 0) return 1000
  if (idx <= 0) return (sortedTasks[0]?.position ?? 1000) - 1000
  if (idx >= sortedTasks.length) return (sortedTasks[sortedTasks.length - 1]?.position ?? 0) + 1000
  return ((sortedTasks[idx - 1]?.position ?? 0) + (sortedTasks[idx]?.position ?? 0)) / 2
}

export default function TasksKanbanView({ tasks, commentCounts = {}, onTaskUpdate, onAddTask, onOpenDetail }) {
  const [activeTask, setActiveTask] = useState(null)

  // Snapshot for rollback on DnD error
  const [snapshot, setSnapshot] = useState(null)

  // Local tasks state for optimistic updates
  const [localTasks, setLocalTasks] = useState(null)
  const displayTasks = localTasks ?? tasks

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const tasksByStatus = useMemo(() => {
    const groups = {}
    COLUMNS.forEach(col => { groups[col.id] = [] })
    displayTasks.forEach(task => {
      if (groups[task.status]) groups[task.status].push(task)
    })
    // Sort each column by position
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => a.position - b.position)
    })
    return groups
  }, [displayTasks])

  function handleDragStart({ active }) {
    const task = displayTasks.find(t => t.id === active.id)
    setActiveTask(task ?? null)
    setSnapshot([...displayTasks])
  }

  function handleDragOver({ active, over }) {
    if (!over || active.id === over.id) return

    const activeTask = displayTasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Over a column droppable (not a card)
    const isOverColumn = COLUMNS.some(c => c.id === over.id)
    const targetStatus = isOverColumn ? over.id : displayTasks.find(t => t.id === over.id)?.status

    if (!targetStatus || activeTask.status === targetStatus) return

    // Move card to new column at the end (live preview)
    setLocalTasks(prev => {
      const base = prev ?? tasks
      const updated = base.map(t =>
        t.id === activeTask.id ? { ...t, status: targetStatus, position: Date.now() } : t
      )
      return updated
    })
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null)

    if (!over) {
      setLocalTasks(null)
      return
    }

    const currentTasks = localTasks ?? tasks
    const draggedTask = currentTasks.find(t => t.id === active.id)
    if (!draggedTask) { setLocalTasks(null); return }

    const isOverColumn = COLUMNS.some(c => c.id === over.id)
    const overTask = isOverColumn ? null : currentTasks.find(t => t.id === over.id)
    const targetStatus = isOverColumn ? over.id : overTask?.status

    if (!targetStatus) { setLocalTasks(null); return }

    const columnTasks = (tasksByStatus[targetStatus] ?? []).filter(t => t.id !== draggedTask.id)
    const overIndex = overTask ? columnTasks.findIndex(t => t.id === over.id) : columnTasks.length
    const newPosition = computePosition(columnTasks, overIndex)

    // Optimistic update
    const updatedTasks = currentTasks.map(t =>
      t.id === draggedTask.id ? { ...t, status: targetStatus, position: newPosition } : t
    )
    setLocalTasks(updatedTasks)

    // Persist — rollback on error
    onTaskUpdate(draggedTask.id, { status: targetStatus, position: newPosition })
      .catch(() => {
        setLocalTasks(snapshot)
      })
      .finally(() => {
        setSnapshot(null)
      })
  }

  function handleDragCancel() {
    setActiveTask(null)
    setLocalTasks(null)
    setSnapshot(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByStatus[col.id] ?? []}
            commentCounts={commentCounts}
            onAdd={() => onAddTask(col.id)}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeTask ? (
          <TaskCardOverlay task={activeTask} commentCount={commentCounts[activeTask.id] ?? 0} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({ column, tasks, commentCounts, onAdd, onOpenDetail }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex w-64 shrink-0 flex-col">
      {/* Header */}
      <div className={`mb-2 flex items-center justify-between rounded-lg border px-3 py-2 ${column.headerClass}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {column.label}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-white/60 px-1.5 text-xs font-medium">
            {tasks.length}
          </span>
          <button
            type="button"
            onClick={onAdd}
            title={`Ajouter dans "${column.label}"`}
            className="flex h-5 w-5 items-center justify-center rounded text-current opacity-60 hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div
        ref={setNodeRef}
        className={[
          'flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors',
          isOver ? 'bg-slate-100 ring-1 ring-slate-300' : '',
        ].join(' ')}
        style={{ minHeight: '120px' }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              commentCount={commentCounts[task.id] ?? 0}
              onClick={onOpenDetail}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 py-8 text-xs italic text-slate-400">
            Aucune tâche
          </div>
        ) : null}
      </div>
    </div>
  )
}
