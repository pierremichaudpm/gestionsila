import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { daysUntil, formatDateOnly, taskPriority } from '../../lib/format'
import { getInternalColor } from '../calendrier/ganttColors'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

// Couleur de la bordure gauche selon le pays du tableau rattaché.
// Même palette que le Gantt (getInternalColor), taupe si transversal.
function borderColor(task) {
  const country = task.lot?.country ?? task.country
  return getInternalColor(country)
}

// Contenu visuel de la carte — partagé entre la carte sortable et l'overlay
// de drag. L'overlay NE DOIT PAS appeler useSortable (anti-pattern @dnd-kit :
// enregistrer deux nœuds sous le même id pendant un drag corrompt la
// résolution du drop → la carte retombe à sa place et rien ne persiste).
function CardBody({ task, commentCount = 0 }) {
  const prio = taskPriority(task.priority)
  const due = task.due_date
  const daysLeft = due ? daysUntil(due) : null
  const overdue = daysLeft !== null && daysLeft < 0

  return (
    <>
      {/* Priorité */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${prio.badgeClass}`}>
          {prio.label}
        </span>
        {task.lot?.name ? (
          <span className="max-w-[100px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
            {task.lot.name}
          </span>
        ) : (
          <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] italic text-slate-400">Transversal</span>
        )}
      </div>

      {/* Titre */}
      <p className="text-sm font-medium leading-snug text-slate-900 line-clamp-2">
        {task.title}
      </p>

      {/* Description courte */}
      {task.description ? (
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{task.description}</p>
      ) : null}

      {/* Footer */}
      <div className="mt-2 flex items-center gap-2">
        {/* Assigné */}
        {task.assignee?.full_name ? (
          <span
            title={task.assignee.full_name}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-navy)] text-[10px] font-semibold text-white"
          >
            {initials(task.assignee.full_name)}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400">?</span>
        )}

        {/* Barre progression */}
        {task.progress_pct > 0 ? (
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[color:var(--color-brand-blue)]"
                style={{ width: `${Math.round(task.progress_pct * 100)}%` }}
              />
            </div>
          </div>
        ) : <div className="flex-1" />}

        {/* Échéance */}
        {due ? (
          <span className={`shrink-0 text-[10px] font-medium ${overdue ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
            {overdue ? 'En retard' : formatDateOnly(due)}
          </span>
        ) : null}

        {/* Commentaires */}
        {commentCount > 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-slate-400">
            <ChatIcon />
            {commentCount}
          </span>
        ) : null}
      </div>
    </>
  )
}

export default function TaskCard({ task, commentCount = 0, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: borderColor(task),
    opacity: isDragging ? 0.35 : 1,
    touchAction: 'none', // évite que le navigateur interprète le drag comme un scroll
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        // Ne pas ouvrir le détail si on est en train de dragger
        if (!isDragging) onClick?.(task)
      }}
      className={[
        'group cursor-pointer select-none rounded-lg border border-slate-200 border-l-4 bg-white p-3 shadow-sm',
        'hover:border-slate-300 hover:shadow-md transition-shadow',
      ].join(' ')}
    >
      <CardBody task={task} commentCount={commentCount} />
    </div>
  )
}

// Version présentationnelle pour le DragOverlay — PAS de useSortable.
export function TaskCardOverlay({ task, commentCount = 0 }) {
  return (
    <div
      style={{ borderLeftColor: borderColor(task) }}
      className="group cursor-pointer select-none rotate-1 rounded-lg border border-slate-200 border-l-4 bg-white p-3 shadow-xl"
    >
      <CardBody task={task} commentCount={commentCount} />
    </div>
  )
}

function ChatIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}
