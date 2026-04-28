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
import CommentThread from '../components/comments/CommentThread.jsx'
import CommentBadge from '../components/comments/CommentBadge.jsx'
import { useCommentCounts } from '../components/comments/useCommentCounts.js'

export default function Livrables() {
  const { projectId, loading: projectLoading } = useCurrentProject()
  const { rates } = useExchangeRates(projectId)
  const [funders, setFunders] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('byFunder')
  const [openIds, setOpenIds] = useState(new Set())
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState(null)
  const [modalFunder, setModalFunder] = useState(null)
  const [expandedDeliverableId, setExpandedDeliverableId] = useState(null)
  const [commentBump, setCommentBump] = useState(0)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data: fundersData, error: fundersError } = await supabase
        .from('funders')
        .select('id, name, country, amount, currency, status, beneficiary:organizations(id, name)')
        .eq('project_id', projectId)
        .order('name', { ascending: true })

      if (!alive) return
      if (fundersError) {
        setError(fundersError)
        setLoading(false)
        return
      }

      const funderIds = (fundersData ?? []).map(f => f.id)
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

      setFunders(fundersData ?? [])
      setDeliverables(deliverablesData)
      setOpenIds(new Set((fundersData ?? []).map(f => f.id)))
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

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
        <div className="space-y-3">
          {funders.map(f => (
            <FunderAccordion
              key={f.id}
              funder={f}
              rates={rates}
              deliverables={deliverablesByFunder.get(f.id) ?? []}
              open={openIds.has(f.id)}
              onToggle={() => toggleOpen(f.id)}
              onAddDeliverable={() => setModalFunder(f)}
              onStatusChange={handleStatusChange}
              commentCounts={commentCounts}
              expandedDeliverableId={expandedDeliverableId}
              onToggleExpanded={toggleDeliverableExpanded}
              projectId={projectId}
              onCommentChange={handleCommentChange}
            />
          ))}
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
    </div>
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

function FunderAccordion({ funder, rates, deliverables, open, onToggle, onAddDeliverable, onStatusChange, commentCounts, expandedDeliverableId, onToggleExpanded, projectId, onCommentChange }) {
  const status = funderStatus(funder.status)
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
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

function DeliverableRow({ deliverable, onStatusChange, commentCount, expanded, onToggleExpanded, projectId, onCommentChange }) {
  const days = daysUntil(deliverable.due_date)
  const overdue = days !== null && days < 0 && !['submitted', 'validated'].includes(deliverable.status)
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
        <span className="flex-1 font-medium text-slate-900">{deliverable.title}</span>
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
