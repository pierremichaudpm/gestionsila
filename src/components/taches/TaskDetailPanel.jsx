import { useEffect, useState } from 'react'
import SlideOver from '../ui/SlideOver.jsx'
import CommentThread from '../comments/CommentThread.jsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider.jsx'
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  formatDateOnly,
  taskPriority,
  taskStatus,
  toneClass,
} from '../../lib/format'

// Champ texte inline éditable
function InlineText({ label, value, onSave, placeholder = '—', multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value ?? '')

  useEffect(() => { setDraft(value ?? '') }, [value])

  function commit() {
    const v = draft.trim()
    if (v !== (value ?? '').trim()) onSave(v || null)
    setEditing(false)
  }

  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            rows={3}
            placeholder={placeholder}
            className="w-full resize-y rounded border border-[color:var(--color-brand-blue)] px-2 py-1 text-sm outline-none"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit() }}
            placeholder={placeholder}
            className="w-full rounded border border-[color:var(--color-brand-blue)] px-2 py-1 text-sm outline-none"
          />
        )
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={`cursor-text rounded px-2 py-1 text-sm hover:bg-slate-50 ${value ? 'text-slate-800' : 'italic text-slate-400'}`}
        >
          {value || placeholder}
        </div>
      )}
    </div>
  )
}

// Champ select inline éditable
function InlineSelect({ label, value, options, onSave, renderLabel }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <select
        value={value ?? ''}
        onChange={e => onSave(e.target.value || null)}
        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

// Slider de progression 0-100%
function ProgressSlider({ value, onSave }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Avancement</span>
        <span className="text-xs font-medium text-slate-700">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={e => onSave(parseInt(e.target.value, 10) / 100)}
        className="w-full accent-[color:var(--color-brand-blue)]"
      />
    </div>
  )
}

export default function TaskDetailPanel({ open, onClose, task, projectId, lots, members, milestones, allTasks, onSaved, onDeleted }) {
  const { profile } = useAuth()
  const isAdmin = profile && task // resolved via page-level accessLevel

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [confirm, setConfirm] = useState(false)

  async function save(fields) {
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('tasks')
      .update(fields)
      .eq('id', task.id)
      .select(`
        *,
        lot:lots(id, name, country),
        assignee:users!tasks_assigned_to_fkey(id, full_name),
        milestone:milestones!tasks_milestone_id_fkey(id, title)
      `)
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data)
  }

  async function handleDelete() {
    setSaving(true)
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onDeleted(task.id)
    onClose()
  }

  if (!task) return null

  const prio = taskPriority(task.priority)
  const st   = taskStatus(task.status)

  const statusOptions    = TASK_STATUS_OPTIONS.map(s  => ({ value: s,  label: taskStatus(s).label }))
  const priorityOptions  = TASK_PRIORITY_OPTIONS.map(p => ({ value: p,  label: taskPriority(p).label }))
  const lotsOptions      = [{ value: '', label: 'Transversal' }, ...lots.map(l => ({ value: l.id, label: l.name }))]
  const membersOptions   = [{ value: '', label: 'Non assigné' }, ...members.map(m => ({ value: m.id, label: m.full_name }))]
  const milestoneOptions = [{ value: '', label: 'Aucun' }, ...milestones.map(m => ({ value: m.id, label: m.title }))]
  const depOptions       = allTasks
    .filter(t => t.id !== task.id)
    .map(t => ({ value: t.id, label: t.title }))

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={task.title}
      subtitle={task.lot?.name ?? 'Transversal'}
      width="xl"
    >
      <div className="space-y-6 px-6 py-5">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}

        {/* Badges statut + priorité */}
        <div className="flex flex-wrap gap-2">
          <span className={`rounded px-2.5 py-1 text-xs font-medium ${toneClass(st.tone)}`}>{st.label}</span>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${prio.badgeClass}`}>{prio.label}</span>
          {task.external_id ? (
            <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-500">{task.external_id}</span>
          ) : null}
        </div>

        {/* ── Champs principaux ── */}
        <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <InlineText
            label="Titre"
            value={task.title}
            onSave={v => save({ title: v })}
          />
          <InlineText
            label="Description"
            value={task.description}
            onSave={v => save({ description: v })}
            placeholder="Ajouter une description…"
            multiline
          />

          <div className="grid grid-cols-2 gap-4">
            <InlineSelect
              label="Statut"
              value={task.status}
              options={statusOptions}
              onSave={v => save({ status: v })}
            />
            <InlineSelect
              label="Priorité"
              value={task.priority}
              options={priorityOptions}
              onSave={v => save({ priority: v })}
            />
            <InlineSelect
              label="Tableau"
              value={task.lot_id ?? ''}
              options={lotsOptions}
              onSave={v => save({ lot_id: v || null })}
            />
            <InlineSelect
              label="Responsable"
              value={task.assigned_to ?? ''}
              options={membersOptions}
              onSave={v => save({ assigned_to: v || null })}
            />
            <InlineSelect
              label="Jalon parent"
              value={task.milestone_id ?? ''}
              options={milestoneOptions}
              onSave={v => save({ milestone_id: v || null })}
            />
          </div>
        </div>

        {/* ── Catégorisation libre ── */}
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <InlineText label="Phase"       value={task.phase}      onSave={v => save({ phase: v })}      placeholder="Ex. Développement" />
          <InlineText label="Acte"        value={task.acte}       onSave={v => save({ acte: v })}       placeholder="Ex. Acte I" />
          <InlineText label="Discipline"  value={task.discipline} onSave={v => save({ discipline: v })} placeholder="Ex. Sound design" />
        </div>

        {/* ── Temporalité + effort ── */}
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Date début</div>
            <input
              type="date"
              value={task.start_date ?? ''}
              onChange={e => save({ start_date: e.target.value || null })}
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Échéance</div>
            <input
              type="date"
              value={task.due_date ?? ''}
              onChange={e => save({ due_date: e.target.value || null })}
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Heures estimées</div>
            <input
              type="number"
              min={0}
              value={task.estim_hours ?? ''}
              onChange={e => save({ estim_hours: e.target.value ? parseInt(e.target.value, 10) : null })}
              placeholder="—"
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Heures réelles</div>
            <input
              type="number"
              min={0}
              value={task.actual_hours ?? ''}
              onChange={e => save({ actual_hours: e.target.value ? parseInt(e.target.value, 10) : null })}
              placeholder="—"
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none"
            />
          </div>

          <div className="col-span-2">
            <ProgressSlider
              value={task.progress_pct}
              onSave={v => save({ progress_pct: v })}
            />
          </div>
        </div>

        {/* ── Livrable + notes ── */}
        <div className="grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <InlineText label="Livrable associé"    value={task.deliverable}      onSave={v => save({ deliverable: v })}      placeholder="Ex. Teaser 90s H.264 v1" />
          <InlineText label="Notes de validation" value={task.validation_notes} onSave={v => save({ validation_notes: v })} placeholder="Critères d'acceptation…" multiline />
          <InlineText label="Notes"               value={task.notes}            onSave={v => save({ notes: v })}             placeholder="Notes libres…"             multiline />
        </div>

        {/* ── Dépendances ── */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dépendances</div>
          <DependenciesSelect
            value={task.depends_on ?? []}
            options={depOptions}
            onSave={v => save({ depends_on: v })}
          />
        </div>

        {/* ── Commentaires ── */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <CommentThread
            projectId={projectId}
            entityType="task"
            entityId={task.id}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <div className="flex gap-2">
            {task.archived ? (
              <button
                type="button"
                onClick={() => save({ archived: false })}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Désarchiver
              </button>
            ) : (
              <button
                type="button"
                onClick={() => save({ archived: true })}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Archiver
              </button>
            )}
          </div>

          {/* Suppression — admin uniquement */}
          <DeleteButton
            confirm={confirm}
            onRequest={() => setConfirm(true)}
            onConfirm={handleDelete}
            onCancel={() => setConfirm(false)}
            disabled={saving}
          />
        </div>
      </div>
    </SlideOver>
  )
}

// Multi-select dépendances
function DependenciesSelect({ value, options, onSave }) {
  function toggle(id) {
    const next = value.includes(id) ? value.filter(x => x !== id) : [...value, id]
    onSave(next)
  }

  const selected = options.filter(o => value.includes(o.value))
  const available = options.filter(o => !value.includes(o.value))

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map(opt => (
            <span
              key={opt.value}
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => toggle(opt.value)}
                className="hover:text-red-600"
                aria-label="Supprimer dépendance"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-slate-400">Aucune dépendance</p>
      )}
      {available.length > 0 ? (
        <select
          value=""
          onChange={e => { if (e.target.value) toggle(e.target.value) }}
          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-[color:var(--color-brand-blue)] focus:outline-none"
        >
          <option value="">+ Ajouter une dépendance…</option>
          {available.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : null}
    </div>
  )
}

function DeleteButton({ confirm, onRequest, onConfirm, onCancel, disabled }) {
  if (!confirm) {
    return (
      <button
        type="button"
        onClick={onRequest}
        disabled={disabled}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Supprimer
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600">Confirmer ?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        Oui, supprimer
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        Annuler
      </button>
    </div>
  )
}
