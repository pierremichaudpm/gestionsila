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

// Édition d'un jalon existant. Réutilise les mêmes champs que NewMilestoneModal,
// pré-remplis depuis le record. Permission RLS : admin partout, coproducer
// limité à son pays (si l'utilisateur tente de modifier le country, le check
// RLS rejette).
export default function EditMilestoneModal({ open, onClose, milestone, lots, accessLevel, onSaved, onDeleted }) {
  const isAdmin = accessLevel === 'admin'
  const [form, setForm] = useState(buildForm(milestone))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(buildForm(milestone))
      setError(null)
    }
  }, [open, milestone])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!milestone) return

    const start = form.start_date
    const end = form.end_date || null
    if (!start) { setError('La date de début est requise.'); return }
    if (end && end < start) {
      setError('La date de fin doit être postérieure ou égale à la date de début.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('milestones')
      .update({
        title: form.title,
        start_date: start,
        end_date: end,
        type: form.type,
        country: form.country,
        lot_id: form.lot_id || null,
        notes: form.notes || null,
      })
      .eq('id', milestone.id)

    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onSaved()
  }

  async function handleDelete() {
    if (!milestone) return
    if (!window.confirm(`Supprimer le jalon « ${milestone.title} » ? Cette action est irréversible.`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestone.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier le jalon">
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
          <Field label="Date de début" required>
            <input
              type="date"
              required
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </Field>
          <Field label="Date de fin">
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => update('end_date', e.target.value)}
              min={form.start_date || undefined}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Laisser la date de fin vide pour un jalon ponctuel.
        </p>

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
              value={`${countryFlag(form.country)} ${countryName(form.country)}`}
              className="block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
          )}
        </Field>

        <Field label="Tableau (optionnel)">
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

function buildForm(milestone) {
  return {
    title:      milestone?.title ?? '',
    start_date: milestone?.start_date ?? '',
    end_date:   milestone?.end_date ?? '',
    type:       milestone?.type ?? 'jalon_production',
    country:    milestone?.country ?? 'CA',
    lot_id:     milestone?.lot_id ?? '',
    notes:      milestone?.notes ?? '',
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
