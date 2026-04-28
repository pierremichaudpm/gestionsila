import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  countryFlag,
  countryName,
  deliverableStatus,
  DELIVERABLE_STATUS_OPTIONS,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

// Édition d'un livrable existant. funder_id réassignable seulement par admin.
// Permission RLS sur deliverables : admin/coproducer/production_manager du
// pays du funder cible.
export default function EditDeliverableModal({ open, onClose, deliverable, funders, accessLevel, onSaved, onDeleted }) {
  const isAdmin = accessLevel === 'admin'
  const [form, setForm] = useState(buildForm(deliverable))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(buildForm(deliverable))
      setError(null)
    }
  }, [open, deliverable])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!deliverable) return
    setSubmitting(true)
    setError(null)

    const patch = {
      title: form.title,
      due_date: form.due_date || null,
      status: form.status,
      notes: form.notes || null,
    }
    if (isAdmin && form.funder_id) {
      patch.funder_id = form.funder_id
    }

    const { error: updateError } = await supabase
      .from('deliverables')
      .update(patch)
      .eq('id', deliverable.id)

    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onSaved()
  }

  async function handleDelete() {
    if (!deliverable) return
    if (!window.confirm(`Supprimer le livrable « ${deliverable.title} » ? Cette action est irréversible.`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase
      .from('deliverables')
      .delete()
      .eq('id', deliverable.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier le livrable">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Titre" required>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date d'échéance">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => update('due_date', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </Field>
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {DELIVERABLE_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{deliverableStatus(s).label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Bailleur">
          {isAdmin ? (
            <select
              value={form.funder_id}
              onChange={(e) => update('funder_id', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {funders.map(f => (
                <option key={f.id} value={f.id}>
                  {countryFlag(f.country)} {f.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={(() => {
                const f = funders.find(x => x.id === form.funder_id)
                return f ? `${countryFlag(f.country)} ${f.name}` : '—'
              })()}
              className="block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
          )}
        </Field>

        <Field label="Notes">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Supprimer
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function buildForm(deliverable) {
  return {
    title:     deliverable?.title ?? '',
    due_date:  deliverable?.due_date ?? '',
    status:    deliverable?.status ?? 'to_produce',
    notes:     deliverable?.notes ?? '',
    funder_id: deliverable?.funder_id ?? '',
  }
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
