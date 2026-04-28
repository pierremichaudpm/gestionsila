import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal.jsx'

// Modal d'édition des deux taux de change. Réutilisé depuis Budget (porte
// d'entrée rapide) et indirectement testable via Paramètres → Taux de change
// qui a sa propre version inline. La sauvegarde déclenche le trigger
// project_settings_log_rate_change qui audit dans exchange_rate_history.
export default function EditRatesModal({ open, onClose, projectId, initialRates, onSaved }) {
  const [draft, setDraft] = useState({ eurToCad: '', cadToEur: '', date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setDraft({
        eurToCad: initialRates?.eurToCad ?? '',
        cadToEur: initialRates?.cadToEur ?? '',
        date:     initialRates?.date     ?? new Date().toISOString().slice(0, 10),
      })
      setError(null)
    }
  }, [open, initialRates])

  async function commit() {
    setError(null)
    const eur = parseFloat(draft.eurToCad)
    const cad = parseFloat(draft.cadToEur)
    if (Number.isNaN(eur) || eur <= 0) { setError('Taux EUR → CAD invalide.'); return }
    if (Number.isNaN(cad) || cad <= 0) { setError('Taux CAD → EUR invalide.'); return }
    if (!draft.date) { setError("Date d'effet requise."); return }

    setSubmitting(true)
    const { error: e } = await supabase
      .from('project_settings')
      .upsert({
        project_id: projectId,
        exchange_rate_eur_to_cad: eur,
        exchange_rate_cad_to_eur: cad,
        exchange_rate_date: draft.date,
      }, { onConflict: 'project_id' })
    setSubmitting(false)
    if (e) { setError(e.message); return }
    onSaved({ eurToCad: eur, cadToEur: cad, date: draft.date })
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier les taux de change">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="1 EUR =">
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={draft.eurToCad}
                onChange={(e) => setDraft({ ...draft, eurToCad: e.target.value })}
                autoFocus
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <span className="text-sm text-slate-500">CAD</span>
            </div>
          </Field>
          <Field label="1 CAD =">
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={draft.cadToEur}
                onChange={(e) => setDraft({ ...draft, cadToEur: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <span className="text-sm text-slate-500">EUR</span>
            </div>
          </Field>
        </div>
        <Field label="Date d'effet">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Les nouveaux taux n'affecteront pas les montants saisis dans le passé
          (sources de financement avec montants contractuels CAD + EUR fixés).
        </p>
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={submitting}
            className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
