import { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, taskPriority, taskStatus } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider.jsx'

export default function NewTaskModal({ open, onClose, projectId, lots, members, defaultStatus = 'todo', onCreated }) {
  const { profile } = useAuth()

  const [form, setForm] = useState(() => ({
    title:       '',
    status:      defaultStatus,
    priority:    'p2',
    lot_id:      '',
    assigned_to: '',
  }))
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState(null)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)

    const payload = {
      project_id:  projectId,
      title:       form.title.trim(),
      status:      form.status,
      priority:    form.priority,
      lot_id:      form.lot_id  || null,
      assigned_to: form.assigned_to || null,
      created_by:  profile?.id ?? null,
      position:    Date.now(),  // position unique provisoire, réordonnée par drag
    }

    const { data, error: err } = await supabase
      .from('tasks')
      .insert(payload)
      .select(`
        *,
        lot:lots(id, name, country),
        assignee:users!tasks_assigned_to_fkey(id, full_name)
      `)
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }

    onCreated(data)
    onClose()
    setForm({ title: '', status: defaultStatus, priority: 'p2', lot_id: '', assigned_to: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tâche" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        {/* Titre */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Titre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Ex. Monter le teaser v1"
            autoFocus
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Statut */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Statut</label>
            <select
              value={form.status}
              onChange={e => handleChange('status', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
            >
              {TASK_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{taskStatus(s).label}</option>
              ))}
            </select>
          </div>

          {/* Priorité */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Priorité</label>
            <select
              value={form.priority}
              onChange={e => handleChange('priority', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
            >
              {TASK_PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>{taskPriority(p).label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Tableau */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tableau</label>
            <select
              value={form.lot_id}
              onChange={e => handleChange('lot_id', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
            >
              <option value="">Transversal</option>
              {lots.map(lot => (
                <option key={lot.id} value={lot.id}>{lot.name}</option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Responsable</label>
            <select
              value={form.assigned_to}
              onChange={e => handleChange('assigned_to', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
            >
              <option value="">Non assigné</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !form.title.trim()}
            className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--color-brand-blue)] disabled:opacity-60 transition"
          >
            {saving ? 'Création…' : 'Créer la tâche'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
