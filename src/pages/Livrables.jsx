import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import { useExchangeRates } from '../lib/useExchangeRates'
import { formatDualString } from '../lib/currency'
import {
  countryFlag,
  countryName,
  daysUntil,
  deliverableStatus,
  DELIVERABLE_STATUS_OPTIONS,
  formatDate,
  funderStatus,
  toneClass,
} from '../lib/format'
import NewDeliverableModal from '../components/livrables/NewDeliverableModal.jsx'
import EditDeliverableModal from '../components/livrables/EditDeliverableModal.jsx'
import FunderDetailPanel from '../components/livrables/FunderDetailPanel.jsx'
import CommentThread from '../components/comments/CommentThread.jsx'
import CommentBadge from '../components/comments/CommentBadge.jsx'
import { useCommentCounts } from '../components/comments/useCommentCounts.js'

// Ordre déterministe des pays Canada → France → Luxembourg, autres en queue.
const COUNTRY_ORDER = ['CA', 'FR', 'LU']
function countryRank(c) {
  const i = COUNTRY_ORDER.indexOf(c)
  return i === -1 ? 99 : i
}

export default function Livrables() {
  const { projectId, accessLevel, loading: projectLoading } = useCurrentProject()
  const { rates } = useExchangeRates(projectId)
  const [funders, setFunders] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('byFunder')
  const [openIds, setOpenIds] = useState(new Set())
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState(null)
  const [modalFunder, setModalFunder] = useState(null)
  const [editingDeliverable, setEditingDeliverable] = useState(null)
  const [detailFunder, setDetailFunder] = useState(null)
  const [expandedDeliverableId, setExpandedDeliverableId] = useState(null)
  const [commentBump, setCommentBump] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [fundersRes, orgsRes] = await Promise.all([
        supabase
          .from('funders')
          .select('id, name, country, amount, currency, status, archived, notes, beneficiary_org_id, beneficiary:organizations(id, name)')
          .eq('project_id', projectId)
          .order('name', { ascending: true }),
        supabase
          .from('organizations')
          .select('id, name')
          .order('name', { ascending: true }),
      ])

      if (!alive) return
      if (fundersRes.error) {
        setError(fundersRes.error)
        setLoading(false)
        return
      }

      const funderIds = (fundersRes.data ?? []).map(f => f.id)
      let deliverablesData = []
      if (funderIds.length > 0) {
        const { data, error: dErr } = await supabase
          .from('deliverables')
          .select('id, funder_id, title, due_date, status, notes')
          .in('funder_id', funderIds)
          .order('due_date', { ascending: true, nullsFirst: false })
        if (!alive) return
        if (dErr) {
          setError(dErr)
          setLoading(false)
          return
        }
        deliverablesData = data ?? []
      }

      setFunders(fundersRes.data ?? [])
      setOrganizations(orgsRes.data ?? [])
      setDeliverables(deliverablesData)
      setOpenIds(new Set((fundersRes.data ?? []).filter(f => !f.archived).map(f => f.id)))
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

  // Split actif vs archivé pour la vue Par bailleur.
  const activeFunders = useMemo(() => funders.filter(f => !f.archived), [funders])
  const archivedFunders = useMemo(() => funders.filter(f => f.archived), [funders])

  // Regroupement Pays > Bailleurs (actifs uniquement).
  const fundersByCountry = useMemo(() => {
    const map = new Map()
    for (const f of activeFunders) {
      if (!map.has(f.country)) map.set(f.country, [])
      map.get(f.country).push(f)
    }
    // tri pays dans l'ordre Canada → France → Luxembourg → autres
    return Array.from(map.entries()).sort(([a], [b]) => countryRank(a) - countryRank(b))
  }, [activeFunders])

  const deliverablesByFunder = useMemo(() => {
    const map = new Map()
    for (const d of deliverables) {
      if (!map.has(d.funder_id)) map.set(d.funder_id, [])
      map.get(d.funder_id).push(d)
    }
    return map
  }, [deliverables])

  const allDeliverableIds = useMemo(() => deliverables.map(d => d.id), [deliverables])
  const commentCounts = useCommentCounts(projectId, 'deliverable', allDeliverableIds, commentBump)
  function toggleDeliverableExpanded(id) {
    setExpandedDeliverableId(prev => prev === id ? null : id)
  }
  function handleCommentChange() {
    setCommentBump(b => b + 1)
  }

  function toggleOpen(id) {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleStatusChange(deliverable, newStatus) {
    setActionError(null)
    const { error } = await supabase
      .from('deliverables')
      .update({ status: newStatus })
      .eq('id', deliverable.id)
    if (error) {
      setActionError(error.message)
      return
    }
    setReloadKey(k => k + 1)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Livrables</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivi des livrables contractuels par bailleur.
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </header>

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {projectLoading || loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-20 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : funders.length === 0 ? (
        <EmptyState />
      ) : view === 'byFunder' ? (
        <div className="space-y-6">
          {fundersByCountry.map(([country, countryFunders]) => {
            const totalDeliverables = countryFunders.reduce(
              (acc, f) => acc + (deliverablesByFunder.get(f.id)?.length ?? 0),
              0
            )
            return (
              <CountrySection
                key={country}
                country={country}
                funderCount={countryFunders.length}
                deliverableCount={totalDeliverables}
              >
                {countryFunders.map(f => (
                  <FunderAccordion
                    key={f.id}
                    funder={f}
                    rates={rates}
                    deliverables={deliverablesByFunder.get(f.id) ?? []}
                    open={openIds.has(f.id)}
                    onToggle={() => toggleOpen(f.id)}
                    onOpenDetails={() => setDetailFunder(f)}
                    onAddDeliverable={() => setModalFunder(f)}
                    onStatusChange={handleStatusChange}
                    onEditDeliverable={(d) => setEditingDeliverable(d)}
                    commentCounts={commentCounts}
                    expandedDeliverableId={expandedDeliverableId}
                    onToggleExpanded={toggleDeliverableExpanded}
                    projectId={projectId}
                    onCommentChange={handleCommentChange}
                  />
                ))}
              </CountrySection>
            )
          })}

          {archivedFunders.length > 0 ? (
            <ArchiveSection
              open={archiveOpen}
              onToggle={() => setArchiveOpen(o => !o)}
              count={archivedFunders.length}
            >
              <ul className="divide-y divide-slate-100">
                {archivedFunders.map(f => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm opacity-70"
                  >
                    <span aria-label={countryName(f.country)} title={countryName(f.country)}>
                      {countryFlag(f.country)}
                    </span>
                    <span className="flex-1 font-medium text-slate-900">{f.name}</span>
                    <span className="text-xs text-slate-500">
                      {formatDualString(f.amount, f.currency, rates)}
                    </span>
                    <span className="inline-flex rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Archivé
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailFunder(f)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-brand-blue hover:text-brand-blue"
                    >
                      Détails
                    </button>
                  </li>
                ))}
              </ul>
            </ArchiveSection>
          ) : null}
        </div>
      ) : (
        <CalendarView
          deliverables={deliverables}
          fundersById={Object.fromEntries(funders.map(f => [f.id, f]))}
        />
      )}

      <NewDeliverableModal
        funder={modalFunder}
        onClose={() => setModalFunder(null)}
        onCreated={() => {
          setModalFunder(null)
          setReloadKey(k => k + 1)
        }}
      />

      <EditDeliverableModal
        open={!!editingDeliverable}
        deliverable={editingDeliverable}
        funders={funders}
        accessLevel={accessLevel}
        onClose={() => setEditingDeliverable(null)}
        onSaved={() => { setEditingDeliverable(null); setReloadKey(k => k + 1) }}
        onDeleted={() => { setEditingDeliverable(null); setReloadKey(k => k + 1) }}
      />

      <FunderDetailPanel
        open={!!detailFunder}
        funder={detailFunder}
        organizations={organizations}
        projectId={projectId}
        accessLevel={accessLevel}
        rates={rates}
        onClose={() => setDetailFunder(null)}
        onSaved={() => { setDetailFunder(null); setReloadKey(k => k + 1) }}
        onArchiveChange={() => { setDetailFunder(null); setReloadKey(k => k + 1) }}
      />
    </div>
  )
}

function CountrySection({ country, funderCount, deliverableCount, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-base">{countryFlag(country)}</span>
        <span>{countryName(country)}</span>
        <span className="text-[11px] font-normal normal-case tracking-normal text-slate-400">
          {funderCount} {funderCount > 1 ? 'bailleurs' : 'bailleur'} · {deliverableCount} {deliverableCount > 1 ? 'livrables' : 'livrable'}
        </span>
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  )
}

function ArchiveSection({ open, onToggle, count, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-100"
        aria-expanded={open}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Archive
          <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-slate-400">
            {count} {count > 1 ? 'bailleurs archivés' : 'bailleur archivé'}
          </span>
        </h2>
        <span className="text-xs text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div className="border-t border-slate-200 bg-white">{children}</div> : null}
    </section>
  )
}

function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 text-xs">
      <ToggleButton active={value === 'byFunder'} onClick={() => onChange('byFunder')}>
        Par bailleur
      </ToggleButton>
      <ToggleButton active={value === 'calendar'} onClick={() => onChange('calendar')}>
        Calendrier
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

function FunderAccordion({ funder, rates, deliverables, open, onToggle, onOpenDetails, onAddDeliverable, onStatusChange, onEditDeliverable, commentCounts, expandedDeliverableId, onToggleExpanded, projectId, onCommentChange }) {
  const status = funderStatus(funder.status)
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span aria-label={countryName(funder.country)} title={countryName(funder.country)}>
              {countryFlag(funder.country)}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">{funder.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {funder.beneficiary?.name ?? '—'} · {formatDualString(funder.amount, funder.currency, rates)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}>
              {status.label}
            </span>
            <span className="text-xs text-slate-400">
              {deliverables.length} {deliverables.length > 1 ? 'livrables' : 'livrable'}
            </span>
            <span className="text-slate-400">{open ? '▾' : '▸'}</span>
          </div>
        </button>
        {onOpenDetails ? (
          <button
            type="button"
            onClick={onOpenDetails}
            className="border-l border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-blue"
            title="Ouvrir le panneau détails du bailleur"
          >
            Détails
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-slate-200">
          {deliverables.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">
              Aucun livrable enregistré pour ce bailleur.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {deliverables.map(d => (
                <DeliverableRow
                  key={d.id}
                  deliverable={d}
                  onStatusChange={onStatusChange}
                  onEdit={onEditDeliverable}
                  commentCount={commentCounts.get(d.id) ?? 0}
                  expanded={expandedDeliverableId === d.id}
                  onToggleExpanded={() => onToggleExpanded(d.id)}
                  projectId={projectId}
                  onCommentChange={onCommentChange}
                />
              ))}
            </ul>
          )}
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
            <button
              type="button"
              onClick={onAddDeliverable}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
            >
              + Livrable
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DeliverableRow({ deliverable, onStatusChange, onEdit, commentCount, expanded, onToggleExpanded, projectId, onCommentChange }) {
  const days = daysUntil(deliverable.due_date)
  const overdue = days !== null && days < 0 && !['submitted', 'validated'].includes(deliverable.status)
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900">{deliverable.title}</div>
          {deliverable.notes ? (
            <div className="mt-0.5 text-xs italic text-slate-500 whitespace-pre-wrap">{deliverable.notes}</div>
          ) : null}
        </div>
        <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
          {formatDate(deliverable.due_date)}
          {overdue ? ' (en retard)' : ''}
        </span>
        <select
          value={deliverable.status}
          onChange={(e) => onStatusChange(deliverable, e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          {DELIVERABLE_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{deliverableStatus(s).label}</option>
          ))}
        </select>
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(deliverable)}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-brand-blue hover:text-brand-blue"
          >
            Modifier
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="rounded px-1.5 py-1 hover:bg-slate-100"
          title={expanded ? 'Masquer les commentaires' : 'Afficher les commentaires'}
        >
          <CommentBadge count={commentCount} />
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <CommentThread
            projectId={projectId}
            entityType="deliverable"
            entityId={deliverable.id}
            onCountChange={onCommentChange}
          />
        </div>
      ) : null}
    </li>
  )
}

function CalendarView({ deliverables, fundersById }) {
  const sorted = useMemo(() => {
    return [...deliverables].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    })
  }, [deliverables])

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Aucun livrable enregistré.</p>
        <p className="mt-1">Bascule en vue "Par bailleur" pour ajouter un livrable.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
      {sorted.map(d => {
        const funder = fundersById[d.funder_id]
        const status = deliverableStatus(d.status)
        const days = daysUntil(d.due_date)
        const overdue = days !== null && days < 0 && !['submitted', 'validated'].includes(d.status)
        return (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <span className={`shrink-0 text-xs ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
              {formatDate(d.due_date)}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{funder?.name ?? '—'}</span>
            <span className="flex-1 truncate font-medium text-slate-900">{d.title}</span>
            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}>
              {status.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">Aucun bailleur enregistré pour ce projet.</p>
      <p className="mt-1">Ajoutez les bailleurs depuis les Paramètres.</p>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger les livrables.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}
