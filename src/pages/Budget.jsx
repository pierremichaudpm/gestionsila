import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import ByCoproducerView from '../components/budget/ByCoproducerView.jsx'
import ConsolidatedView from '../components/budget/ConsolidatedView.jsx'
import ByLotView from '../components/budget/ByLotView.jsx'

export default function Budget() {
  const { projectId, accessLevel, orgId, loading: projectLoading } = useCurrentProject()
  const [orgs, setOrgs] = useState([])
  const [lots, setLots] = useState([])
  const [lines, setLines] = useState([])
  const [rate, setRate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('byCoproducer')
  const [editingRate, setEditingRate] = useState(false)
  const [rateDraft, setRateDraft] = useState('')
  const [rateError, setRateError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const isAdmin = accessLevel === 'admin'

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [orgsRes, lotsRes, linesRes, settingsRes] = await Promise.all([
        supabase.from('organizations').select('id, name, country, currency, role'),
        supabase.from('lots')
          .select('id, name, country, director, sort_order')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
        supabase.from('budget_lines')
          .select('id, org_id, lot_id, category, planned, actual, currency')
          .eq('project_id', projectId)
          .order('category', { ascending: true }),
        supabase.from('project_settings')
          .select('exchange_rate_eur_to_cad')
          .eq('project_id', projectId)
          .maybeSingle(),
      ])

      if (!alive) return
      const firstError = orgsRes.error ?? lotsRes.error ?? linesRes.error ?? settingsRes.error
      if (firstError) {
        setError(firstError)
        setLoading(false)
        return
      }
      setOrgs(orgsRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setLines(linesRes.data ?? [])
      setRate(settingsRes.data?.exchange_rate_eur_to_cad ?? null)
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  function canEditOrg(targetOrgId) {
    if (accessLevel === 'admin') return true
    if (accessLevel === 'coproducer' && targetOrgId === orgId) return true
    return false
  }

  async function handleCreate(targetOrgId, currency) {
    setActionError(null)
    const { data, error } = await supabase
      .from('budget_lines')
      .insert({
        project_id: projectId,
        org_id: targetOrgId,
        category: 'Nouveau poste',
        planned: 0,
        actual: 0,
        currency,
      })
      .select('id, org_id, lot_id, category, planned, actual, currency')
      .single()
    if (error) {
      setActionError(error.message)
      return
    }
    setLines(prev => [...prev, data])
  }

  async function handleUpdate(id, patch) {
    setActionError(null)
    const previous = lines
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
    const { error } = await supabase.from('budget_lines').update(patch).eq('id', id)
    if (error) {
      setLines(previous)
      setActionError(error.message)
    }
    return { error }
  }

  async function handleDelete(id) {
    setActionError(null)
    const previous = lines
    setLines(prev => prev.filter(l => l.id !== id))
    const { error } = await supabase.from('budget_lines').delete().eq('id', id)
    if (error) {
      setLines(previous)
      setActionError(error.message)
    }
  }

  async function commitRate() {
    setRateError(null)
    const v = parseFloat(rateDraft)
    if (Number.isNaN(v) || v <= 0) {
      setRateError('Taux invalide')
      return
    }
    const { error } = await supabase
      .from('project_settings')
      .upsert(
        { project_id: projectId, exchange_rate_eur_to_cad: v },
        { onConflict: 'project_id' }
      )
    if (error) {
      setRateError(error.message)
      return
    }
    setRate(v)
    setEditingRate(false)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Budget</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivi budgétaire par coproducteur. Devises locales conservées ; conversions calculées côté client.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ViewToggle value={view} onChange={setView} isAdmin={isAdmin} />
          <RateBadge
            rate={rate}
            isAdmin={isAdmin}
            editing={editingRate}
            draft={rateDraft}
            onEdit={() => { setRateDraft(rate ?? ''); setEditingRate(true) }}
            onCancel={() => { setEditingRate(false); setRateError(null) }}
            onChange={setRateDraft}
            onCommit={commitRate}
            error={rateError}
          />
        </div>
      </header>

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {projectLoading || loading ? (
        <div className="space-y-3">
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : accessLevel === 'contractor' ? (
        <NoAccessState />
      ) : view === 'byCoproducer' ? (
        <ByCoproducerView
          orgs={orgs}
          lines={lines}
          lots={lots}
          canEditOrg={canEditOrg}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ) : view === 'consolidated' && isAdmin ? (
        <ConsolidatedView orgs={orgs} lines={lines} lots={lots} rate={rate} />
      ) : view === 'byLot' ? (
        <ByLotView orgs={orgs} lines={lines} lots={lots} />
      ) : null}
    </div>
  )
}

function ViewToggle({ value, onChange, isAdmin }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 text-xs">
      <ToggleButton active={value === 'byCoproducer'} onClick={() => onChange('byCoproducer')}>
        Par coproducteur
      </ToggleButton>
      {isAdmin ? (
        <ToggleButton active={value === 'consolidated'} onClick={() => onChange('consolidated')}>
          Consolidée
        </ToggleButton>
      ) : null}
      <ToggleButton active={value === 'byLot'} onClick={() => onChange('byLot')}>
        Par lot
      </ToggleButton>
    </div>
  )
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded px-3 py-1.5 font-medium transition-colors',
        active
          ? 'bg-[color:var(--color-brand-navy)] text-white'
          : 'text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function RateBadge({ rate, isAdmin, editing, draft, onEdit, onCancel, onChange, onCommit, error }) {
  if (editing) {
    return (
      <div className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs">
        <span className="text-slate-500">1 EUR =</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-right text-sm tabular-nums focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          autoFocus
        />
        <span className="text-slate-500">CAD</span>
        <button type="button" onClick={onCommit} className="rounded bg-[color:var(--color-brand-navy)] px-2 py-1 text-white hover:bg-[color:var(--color-brand-blue)]">
          OK
        </button>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          Annuler
        </button>
        {error ? <span className="text-red-600">{error}</span> : null}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
      <span>
        Taux : <strong className="text-slate-900 tabular-nums">{rate ? `1 EUR = ${rate} CAD` : 'Non défini'}</strong>
      </span>
      {isAdmin ? (
        <button type="button" onClick={onEdit} className="text-brand-blue hover:underline">
          {rate ? 'Modifier' : 'Définir'}
        </button>
      ) : null}
    </div>
  )
}

function NoAccessState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">Accès au budget non autorisé.</p>
      <p className="mt-1">Seuls les producteurs et coproducteurs peuvent consulter le budget.</p>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger le budget.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}
