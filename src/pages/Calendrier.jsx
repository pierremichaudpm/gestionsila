import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  formatDateOnly,
  formatMonth,
  milestoneType,
  MILESTONE_TYPE_OPTIONS,
} from '../lib/format'
import NewMilestoneModal from '../components/calendrier/NewMilestoneModal.jsx'

export default function Calendrier() {
  const { projectId, accessLevel, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ country: 'all', type: 'all', lot: 'all' })
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const canCreate = accessLevel === 'admin' || accessLevel === 'coproducer'

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [msRes, delRes, lotsRes] = await Promise.all([
        supabase
          .from('milestones')
          .select('id, lot_id, title, date, type, country, notes')
          .eq('project_id', projectId)
          .order('date', { ascending: true }),
        supabase
          .from('deliverables')
          .select('id, title, due_date, status, funder:funders!inner(id, name, country, project_id)')
          .eq('funder.project_id', projectId)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true }),
        supabase
          .from('lots')
          .select('id, name, country')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
      ])

      if (!alive) return
      const firstError = msRes.error ?? delRes.error ?? lotsRes.error
      if (firstError) {
        setError(firstError)
        setLoading(false)
        return
      }
      setMilestones(msRes.data ?? [])
      setDeliverables(delRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

  const items = useMemo(() => {
    const lotsById = Object.fromEntries(lots.map(l => [l.id, l]))
    const fromMilestones = milestones.map(m => ({
      id: `milestone-${m.id}`,
      source: 'milestone',
      date: m.date,
      title: m.title,
      type: m.type,
      country: m.country,
      lotId: m.lot_id ?? null,
      context: m.lot_id ? lotsById[m.lot_id]?.name ?? '—' : null,
      notes: m.notes,
    }))
    const fromDeliverables = deliverables.map(d => ({
      id: `deliverable-${d.id}`,
      source: 'deliverable',
      date: d.due_date,
      title: d.title,
      type: 'depot_fonds',
      country: d.funder?.country ?? null,
      lotId: null,
      context: d.funder?.name ?? null,
      notes: null,
      status: d.status,
    }))
    return [...fromMilestones, ...fromDeliverables].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    )
  }, [milestones, deliverables, lots])

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filters.country !== 'all' && item.country !== filters.country) return false
      if (filters.type !== 'all' && item.type !== filters.type) return false
      if (filters.lot !== 'all') {
        if (filters.lot === 'transversal' && item.lotId) return false
        if (filters.lot !== 'transversal' && item.lotId !== filters.lot) return false
      }
      return true
    })
  }, [items, filters])

  const grouped = useMemo(() => {
    const byMonth = new Map()
    for (const item of filtered) {
      const key = item.date.slice(0, 7)
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key).push(item)
    }
    return Array.from(byMonth.entries())
  }, [filtered])

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Calendrier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Timeline unifiée : jalons + dépôts aux bailleurs, tous pays confondus.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!projectId || !profile}
            className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Jalon
          </button>
        ) : null}
      </header>

      <Filters filters={filters} onChange={updateFilter} lots={lots} />

      {projectLoading || loading ? (
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-12 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : grouped.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(v => v !== 'all')} />
      ) : (
        <div className="space-y-8">
          {grouped.map(([monthKey, entries]) => (
            <MonthSection key={monthKey} monthKey={monthKey} items={entries} lots={lots} />
          ))}
        </div>
      )}

      <NewMilestoneModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        lots={lots}
        profile={profile}
        accessLevel={accessLevel}
        onCreated={() => {
          setModalOpen(false)
          setReloadKey(k => k + 1)
        }}
      />
    </div>
  )
}

function Filters({ filters, onChange, lots }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <FilterSelect label="Pays" value={filters.country} onChange={(v) => onChange('country', v)}>
        <option value="all">Tous</option>
        {COUNTRY_OPTIONS.map(c => (
          <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
        ))}
      </FilterSelect>
      <FilterSelect label="Type" value={filters.type} onChange={(v) => onChange('type', v)}>
        <option value="all">Tous</option>
        {MILESTONE_TYPE_OPTIONS.map(t => (
          <option key={t} value={t}>{milestoneType(t).label}</option>
        ))}
      </FilterSelect>
      <FilterSelect label="Lot" value={filters.lot} onChange={(v) => onChange('lot', v)}>
        <option value="all">Tous</option>
        <option value="transversal">Transversal (sans lot)</option>
        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </FilterSelect>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {children}
      </select>
    </label>
  )
}

function MonthSection({ monthKey, items, lots }) {
  const lotsById = Object.fromEntries(lots.map(l => [l.id, l]))
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {formatMonth(monthKey)}
      </h2>
      <ol className="relative ml-3 space-y-3 border-l-2 border-slate-200 pl-6">
        {items.map(item => {
          const type = milestoneType(item.type)
          const lot = item.lotId ? lotsById[item.lotId] : null
          return (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[31px] top-3 inline-block h-3 w-3 rounded-full border-2 border-white bg-[color:var(--color-brand-navy)]"
                aria-hidden="true"
              />
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">
                    {formatDateOnly(item.date)}
                  </span>
                  <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${type.badge}`}>
                    {type.label}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-900">{item.title}</span>
                  {item.country ? (
                    <span title={countryName(item.country)} aria-label={countryName(item.country)}>
                      {countryFlag(item.country)}
                    </span>
                  ) : null}
                </div>
                {(item.context || lot || item.notes) ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {lot ? <span>{lot.name}</span> : null}
                    {item.context && !lot ? <span>{item.context}</span> : null}
                    {item.context && lot ? <span>· {item.context}</span> : null}
                    {item.notes ? <span className="italic">— {item.notes}</span> : null}
                    {item.source === 'deliverable' ? (
                      <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-400">livrable</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function EmptyState({ hasFilters }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">
        {hasFilters ? 'Aucune entrée ne correspond aux filtres.' : 'Aucun jalon ni livrable enregistré.'}
      </p>
      <p className="mt-1">
        {hasFilters
          ? 'Modifiez les filtres pour élargir la timeline.'
          : 'Ajoutez le premier jalon via « + Jalon » ou créez un livrable depuis la page Livrables.'}
      </p>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger le calendrier.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}
