import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  milestoneType,
  MILESTONE_TYPE_OPTIONS,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

export default function NewMilestoneModal({ open, onClose, projectId, lots, profile, accessLevel, onCreated }) {
  const isAdmin = accessLevel === 'admin'
  const initial = {
    title: '',
    date: '',
    type: 'depot_fonds',
    country: profile?.country ?? 'CA',
    lot_id: '',
    notes: '',
  }
  const [form, setForm] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm({ ...initial, country: profile?.country ?? 'CA' })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!projectId || !profile) return
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('milestones').insert({
      project_id: projectId,
      lot_id: form.lot_id || null,
      title: form.title,
      date: form.date,
      type: form.type,
      country: form.country,
      notes: form.notes || null,
      created_by: profile.id,
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau jalon">
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

        <Field label="Date" required>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => update('type', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {MILESTONE_TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{milestoneType(t).label}</option>
            ))}
          </select>
        </Field>

        <Field label="Pays">
          {isAdmin ? (
            <select
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {COUNTRY_OPTIONS.map(c => (
                <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={`${countryFlag(profile?.country)} ${countryName(profile?.country)}`}
              className="block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
          )}
        </Field>

        <Field label="Lot (optionnel)">
          <select
            value={form.lot_id}
            onChange={(e) => update('lot_id', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Aucun (transversal)</option>
            {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
