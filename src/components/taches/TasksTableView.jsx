import { useState } from 'react'
import { formatDateOnly, relativeTime, taskPriority, taskStatus, toneClass } from '../../lib/format'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

const COLUMNS_DEF = [
  { key: 'priority',    label: 'Prio',        sortable: true,  width: 'w-16' },
  { key: 'title',       label: 'Tâche',       sortable: true,  width: '' },
  { key: 'status',      label: 'Statut',      sortable: true,  width: 'w-28' },
  { key: 'assigned_to', label: 'Responsable', sortable: false, width: 'w-32' },
  { key: 'due_date',    label: 'Échéance',    sortable: true,  width: 'w-28' },
  { key: 'lot',         label: 'Tableau',     sortable: false, width: 'w-32' },
  { key: 'progress_pct',label: 'Avancement',  sortable: true,  width: 'w-24' },
  { key: 'comments',    label: '',            sortable: false, width: 'w-10' },
  { key: 'updated_at',  label: 'Modifié',     sortable: true,  width: 'w-24' },
]

const PRIORITY_ORDER = { p0: 0, p1: 1, p2: 2, p3: 3 }
const STATUS_ORDER   = { todo: 0, in_progress: 1, blocked: 2, done: 3, validated: 4 }

function sortTasks(tasks, sortKey, sortDir, commentCounts) {
  return [...tasks].sort((a, b) => {
    let va, vb
    switch (sortKey) {
      case 'priority':    va = PRIORITY_ORDER[a.priority] ?? 99;  vb = PRIORITY_ORDER[b.priority] ?? 99; break
      case 'status':      va = STATUS_ORDER[a.status] ?? 99;       vb = STATUS_ORDER[b.status] ?? 99;    break
      case 'due_date':    va = a.due_date ?? 'zzzz';               vb = b.due_date ?? 'zzzz';            break
      case 'progress_pct':va = a.progress_pct ?? 0;                vb = b.progress_pct ?? 0;             break
      case 'updated_at':  va = a.updated_at ?? '';                 vb = b.updated_at ?? '';              break
      default:            va = (a[sortKey] ?? '').toString().toLowerCase()
                          vb = (b[sortKey] ?? '').toString().toLowerCase()
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })
}

export default function TasksTableView({ tasks, commentCounts = {}, onOpenDetail }) {
  const [sortKey, setSortKey]   = useState('priority')
  const [sortDir, setSortDir]   = useState('asc')

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortTasks(tasks, sortKey, sortDir, commentCounts)

  if (tasks.length === 0) {
    return (
      <p className="py-12 text-center text-sm italic text-slate-400">
        Aucune tâche ne correspond aux filtres.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {COLUMNS_DEF.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.width}`}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-slate-800"
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(task => (
            <TableRow
              key={task.id}
              task={task}
              commentCount={commentCounts[task.id] ?? 0}
              onClick={() => onOpenDetail(task)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({ task, commentCount, onClick }) {
  const prio  = taskPriority(task.priority)
  const st    = taskStatus(task.status)
  const overdue = task.due_date && new Date(task.due_date) < new Date() && !['done', 'validated'].includes(task.status)

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-slate-50 transition-colors"
    >
      {/* Priorité */}
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${prio.badgeClass}`}>
          {prio.label}
        </span>
      </td>

      {/* Titre */}
      <td className="px-3 py-2.5">
        <span className="font-medium text-slate-900">{task.title}</span>
        {task.description ? (
          <span className="ml-2 text-xs text-slate-400 line-clamp-1">{task.description}</span>
        ) : null}
      </td>

      {/* Statut */}
      <td className="px-3 py-2.5">
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${toneClass(st.tone)}`}>
          {st.label}
        </span>
      </td>

      {/* Responsable */}
      <td className="px-3 py-2.5">
        {task.assignee?.full_name ? (
          <span className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-brand-navy)] text-[10px] font-semibold text-white">
              {initials(task.assignee.full_name)}
            </span>
            <span className="max-w-[90px] truncate text-xs text-slate-700">{task.assignee.full_name}</span>
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">—</span>
        )}
      </td>

      {/* Échéance */}
      <td className="px-3 py-2.5">
        {task.due_date ? (
          <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
            {formatDateOnly(task.due_date)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* Tableau */}
      <td className="px-3 py-2.5">
        {task.lot?.name ? (
          <span className="max-w-[110px] truncate rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {task.lot.name}
          </span>
        ) : (
          <span className="text-xs italic text-slate-400">Transversal</span>
        )}
      </td>

      {/* Avancement */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[color:var(--color-brand-blue)]"
              style={{ width: `${Math.round((task.progress_pct ?? 0) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">
            {Math.round((task.progress_pct ?? 0) * 100)}%
          </span>
        </div>
      </td>

      {/* Commentaires */}
      <td className="px-3 py-2.5 text-center">
        {commentCount > 0 ? (
          <span className="text-xs text-slate-400">{commentCount}</span>
        ) : null}
      </td>

      {/* Modifié */}
      <td className="px-3 py-2.5">
        <span className="text-xs text-slate-400">
          {relativeTime(task.updated_at ?? task.created_at)}
        </span>
      </td>
    </tr>
  )
}

function SortIcon({ active, dir }) {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className={active ? 'opacity-100' : 'opacity-30'} aria-hidden="true">
      <path d="M4 1L1 4h6L4 1Z" fill={active && dir === 'asc' ? 'currentColor' : '#94a3b8'} />
      <path d="M4 11l3-3H1l3 3Z" fill={active && dir === 'desc' ? 'currentColor' : '#94a3b8'} />
    </svg>
  )
}
