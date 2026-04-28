import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import { useAuth } from '../lib/AuthProvider.jsx'
import ByCoproducerView from '../components/budget/ByCoproducerView.jsx'
import ConsolidatedView from '../components/budget/ConsolidatedView.jsx'
import ByLotView from '../components/budget/ByLotView.jsx'
import StructureFinanciereView from '../components/budget/StructureFinanciereView.jsx'
import EditRatesModal from '../components/parametres/EditRatesModal.jsx'
import { useCommentCounts } from '../components/comments/useCommentCounts.js'

export default function Budget() {
  const { projectId, accessLevel, orgId, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const userCountry = profile?.country ?? null
  const [orgs, setOrgs] = useState([])
  const [lots, setLots] = useState([])
  const [lines, setLines] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [rates, setRates] = useState({ eurToCad: null, cadToEur: null, date: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('byCoproducer')
  const [rateModalOpen, setRateModalOpen] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [expandedLineId, setExpandedLineId] = useState(null)
  const [commentBump, setCommentBump] = useState(0)

  const lineIds = lines.map(l => l.id)
  const commentCounts = useCommentCounts(projectId, 'budget_line', lineIds, commentBump)
  function toggleLineExpanded(id) {
    setExpandedLineId(prev => prev === id ? null : id)
  }
  function handleCommentChange() {
    setCommentBump(b => b + 1)
  }

  const isAdmin = accessLevel === 'admin'

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [orgsRes, lotsRes, linesRes, settingsRes, fundingRes] = await Promise.all([
        supabase.from('organizations').select('id, name, country, currency, role'),
        supabase.from('lots')
          .select('id, name, country, director, sort_order')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
        supabase.from('budget_lines')
          .select('id, org_id, lot_id, code, category, planned, actual, currency, cost_origin, imported_value, last_modified_at, last_modified_by_user:users!budget_lines_last_modified_by_fkey(full_name)')
          .eq('project_id', projectId)
          .order('code', { ascending: true, nullsFirst: false }),
        supabase.from('project_settings')
          .select('exchange_rate_eur_to_cad, exchange_rate_cad_to_eur, exchange_rate_date')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase.from('funding_sources')
          .select('id, country, source_name, amount_eur, amount_cad, status, notes, sort_order, imported_value, last_modified_at, last_modified_by_user:users!funding_sources_last_modified_by_fkey(full_name)')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
      ])

      if (!alive) return
      const firstError = orgsRes.error ?? lotsRes.error ?? linesRes.error ?? settingsRes.error ?? fundingRes.error
      if (firstError) {
        setError(firstError)
        setLoading(false)
        return
      }
      setOrgs(orgsRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setLines(linesRes.data ?? [])
      setRates({
        eurToCad: settingsRes.data?.exchange_rate_eur_to_cad ? Number(settingsRes.data.exchange_rate_eur_to_cad) : null,
        cadToEur: settingsRes.data?.exchange_rate_cad_to_eur ? Number(settingsRes.data.exchange_rate_cad_to_eur) : null,
        date:     settingsRes.data?.exchange_rate_date ?? null,
      })
      setFundingSources(fundingRes.data ?? [])
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
      .select('id, org_id, lot_id, code, category, planned, actual, currency, cost_origin, imported_value, last_modified_at, last_modified_by_user:users!budget_lines_last_modified_by_fkey(full_name)')
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
          <RateBadge rates={rates} isAdmin={isAdmin} onEdit={() => setRateModalOpen(true)} />
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
          rates={rates}
          isAdmin={isAdmin}
          canEditOrg={canEditOrg}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          projectId={projectId}
          commentCounts={commentCounts}
          expandedLineId={expandedLineId}
          onToggleExpanded={toggleLineExpanded}
          onCommentChange={handleCommentChange}
        />
      ) : view === 'consolidated' && isAdmin ? (
        <ConsolidatedView
          orgs={orgs}
          lines={lines}
          lots={lots}
          rates={rates}
          projectId={projectId}
          commentCounts={commentCounts}
          expandedLineId={expandedLineId}
          onToggleExpanded={toggleLineExpanded}
          onCommentChange={handleCommentChange}
        />
      ) : view === 'byLot' ? (
        <ByLotView
          orgs={orgs}
          lines={lines}
          lots={lots}
          rates={rates}
          projectId={projectId}
          commentCounts={commentCounts}
          expandedLineId={expandedLineId}
          onToggleExpanded={toggleLineExpanded}
          onCommentChange={handleCommentChange}
        />
      ) : view === 'structure' ? (
        <StructureFinanciereView
          projectId={projectId}
          orgs={orgs}
          lines={lines}
          rates={rates}
          accessLevel={accessLevel}
          userCountry={userCountry}
          fundingSources={fundingSources}
          onSourcesChange={setFundingSources}
        />
      ) : null}

      <EditRatesModal
        open={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        projectId={projectId}
        initialRates={rates}
        onSaved={(newRates) => {
          setRates(newRates)
          setRateModalOpen(false)
        }}
      />
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
        Par tableau
      </ToggleButton>
      <ToggleButton active={value === 'structure'} onClick={() => onChange('structure')}>
        Structure financière
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

function RateBadge({ rates, isAdmin, onEdit }) {
  // Édition rapide via modal (admin only). Une 2e porte d'entrée existe dans
  // Paramètres → Taux de change avec l'historique complet.
  const eur = rates?.eurToCad
  const cad = rates?.cadToEur
  const fmt = (v) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  return (
    <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
      {eur && cad ? (
        <span>
          <strong className="text-slate-900 tabular-nums">1 EUR = {fmt(eur)} CAD</strong>
          <span className="mx-1 text-slate-300">·</span>
          <strong className="text-slate-900 tabular-nums">1 CAD = {fmt(cad)} EUR</strong>
        </span>
      ) : (
        <span>Taux : <strong className="text-slate-900">Non défini</strong></span>
      )}
      {isAdmin ? (
        <button type="button" onClick={onEdit} className="text-brand-blue hover:underline">
          Modifier
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
