import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { relativeTime } from '../../lib/format'

// Édition des deux taux de change indépendants (1 EUR → CAD et 1 CAD → EUR).
// Affichage de l'historique des changements (alimenté par le trigger
// project_settings_log_rate_change). Admin only — la page Paramètres gate
// déjà ce composant.
export default function ExchangeRateSection({ projectId, currentUserId }) {
  const [settings, setSettings] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ eurToCad: '', cadToEur: '', date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true
    load(alive)
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function load(alive = true) {
    setLoading(true)
    setError(null)
    const [settingsRes, historyRes] = await Promise.all([
      supabase
        .from('project_settings')
        .select('exchange_rate_eur_to_cad, exchange_rate_cad_to_eur, exchange_rate_date, updated_at')
        .eq('project_id', projectId)
        .maybeSingle(),
      supabase
        .from('exchange_rate_history')
        .select('id, rate_eur_to_cad, rate_cad_to_eur, effective_date, created_at, set_by:users!exchange_rate_history_set_by_user_id_fkey(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (!alive) return
    if (settingsRes.error || historyRes.error) {
      setError(settingsRes.error ?? historyRes.error)
      setLoading(false)
      return
    }
    setSettings(settingsRes.data ?? null)
    setHistory(historyRes.data ?? [])
    setLoading(false)
  }

  function startEdit() {
    setDraft({
      eurToCad: settings?.exchange_rate_eur_to_cad ?? '',
      cadToEur: settings?.exchange_rate_cad_to_eur ?? '',
      date:     settings?.exchange_rate_date ?? new Date().toISOString().slice(0, 10),
    })
    setSubmitError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSubmitError(null)
  }

  async function commit() {
    setSubmitError(null)
    const eur = parseFloat(draft.eurToCad)
    const cad = parseFloat(draft.cadToEur)
    if (Number.isNaN(eur) || eur <= 0) {
      setSubmitError('Taux EUR → CAD invalide.')
      return
    }
    if (Number.isNaN(cad) || cad <= 0) {
      setSubmitError('Taux CAD → EUR invalide.')
      return
    }
    if (!draft.date) {
      setSubmitError('Date d\'effet requise.')
      return
    }

    setSubmitting(true)
    // L'UPDATE déclenche le trigger qui pousse une entrée dans
    // exchange_rate_history avec auth.uid() comme set_by_user_id.
    const { error: updateError } = await supabase
      .from('project_settings')
      .upsert(
        {
          project_id: projectId,
          exchange_rate_eur_to_cad: eur,
          exchange_rate_cad_to_eur: cad,
          exchange_rate_date:       draft.date,
        },
        { onConflict: 'project_id' }
      )
    setSubmitting(false)
    if (updateError) {
      setSubmitError(updateError.message)
      return
    }
    setEditing(false)
    await load()
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Taux de change</h2>
          <p className="text-xs text-slate-500">
            Conversion CAD ↔ EUR utilisée par le module Budget. Les deux taux
            sont indépendants (pas calculés l'un de l'autre).
          </p>
        </div>
        {!editing && !loading ? (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
          >
            Modifier
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className="h-20 animate-pulse rounded bg-slate-100" />
      ) : error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>
      ) : editing ? (
        <EditForm
          draft={draft}
          onChange={setDraft}
          onCommit={commit}
          onCancel={cancelEdit}
          submitting={submitting}
          error={submitError}
        />
      ) : (
        <Display settings={settings} history={history} />
      )}

      {!loading && !error ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Modifier ces taux n'affecte pas les montants saisis dans le passé
          (les funding_sources stockent leurs montants en EUR ET CAD côté à côté,
          contractuels). Seules les conversions affichées pour les budgets en
          devise unique seront actualisées.
        </div>
      ) : null}
    </section>
  )
}

function Display({ settings, history }) {
  const eur = settings?.exchange_rate_eur_to_cad
  const cad = settings?.exchange_rate_cad_to_eur
  const date = settings?.exchange_rate_date
  const last = history[0]
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">1 EUR =</div>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {eur ? `${Number(eur).toFixed(4)} CAD` : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">1 CAD =</div>
          <div className="text-2xl font-semibold tabular-nums text-slate-900">
            {cad ? `${Number(cad).toFixed(4)} EUR` : '—'}
          </div>
        </div>
      </div>
      {date || last ? (
        <p className="text-xs text-slate-500">
          {date ? <>Effectifs au <strong>{formatLocalDate(date)}</strong></> : null}
          {last?.set_by?.full_name ? <> · définis par <strong>{last.set_by.full_name}</strong></> : null}
        </p>
      ) : null}

      {history.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Historique des changements
          </h3>
          <ul className="divide-y divide-slate-100 rounded border border-slate-200">
            {history.map(entry => (
              <li key={entry.id} className="grid grid-cols-1 gap-1 px-3 py-2 text-sm sm:grid-cols-[1fr_auto_auto]">
                <span className="tabular-nums text-slate-700">
                  1 EUR = {Number(entry.rate_eur_to_cad).toFixed(4)} CAD
                  <span className="mx-2 text-slate-300">·</span>
                  1 CAD = {Number(entry.rate_cad_to_eur).toFixed(4)} EUR
                </span>
                <span className="text-xs text-slate-500">
                  {entry.set_by?.full_name ?? 'utilisateur supprimé'}
                </span>
                <span className="text-xs text-slate-400">{relativeTime(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function EditForm({ draft, onChange, onCommit, onCancel, submitting, error }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="1 EUR =">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={draft.eurToCad}
              onChange={(e) => onChange({ ...draft, eurToCad: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              autoFocus
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
              onChange={(e) => onChange({ ...draft, cadToEur: e.target.value })}
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
          onChange={(e) => onChange({ ...draft, date: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </Field>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={submitting}
          className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
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

function formatLocalDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(s => parseInt(s, 10))
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
