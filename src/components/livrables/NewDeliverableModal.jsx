import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  deliverableStatus,
  DELIVERABLE_STATUS_OPTIONS,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

const INITIAL = {
  title: '',
  due_date: '',
  status: 'to_produce',
  notes: '',
}

export default function NewDeliverableModal({ funder, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const open = !!funder

  useEffect(() => {
    if (open) {
      setForm(INITIAL)
      setError(null)
    }
  }, [open, funder?.id])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!funder) return
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('deliverables').insert({
      funder_id: funder.id,
      title: form.title,
      due_date: form.due_date || null,
      status: form.status,
      notes: form.notes || null,
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Nouveau livrable — ${funder?.name ?? ''}`}>
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

        <Field label="Notes">
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
      </form>
    </Modal>
  )
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
