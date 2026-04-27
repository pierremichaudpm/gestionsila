import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  countryFlag,
  formatDate,
  milestoneType,
} from '../../lib/format'

export default function UpcomingDeliverablesBlock({ projectId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const today = new Date().toISOString().slice(0, 10)

      const deliverablesQ = supabase
        .from('deliverables')
        .select(
          'id, title, due_date, status, funder:funders!inner(id, name, country, project_id)'
        )
        .eq('funder.project_id', projectId)
        .in('status', ['to_produce', 'in_progress'])
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(10)

      const milestonesQ = supabase
        .from('milestones')
        .select('id, title, date, type, country')
        .eq('project_id', projectId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10)

      const [delRes, msRes] = await Promise.all([deliverablesQ, milestonesQ])
      if (!alive) return

      if (delRes.error || msRes.error) {
        setError(delRes.error ?? msRes.error)
        setLoading(false)
        return
      }

      const deliverableItems = (delRes.data ?? []).map(d => ({
        id: `deliverable-${d.id}`,
        date: d.due_date,
        title: d.title,
        type: 'depot_fonds',
        typeLabel: 'Dépôt',
        country: d.funder?.country ?? null,
        context: d.funder?.name ?? '—',
        to: '/livrables',
      }))

      const milestoneItems = (msRes.data ?? []).map(m => ({
        id: `milestone-${m.id}`,
        date: m.date,
        title: m.title,
        type: m.type,
        typeLabel: milestoneType(m.type).label,
        country: m.country,
        context: null,
        to: '/calendrier',
      }))

      const merged = [...deliverableItems, ...milestoneItems]
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        .slice(0, 10)

      setItems(merged)
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prochaines échéances
        </h2>
        {!loading && !error ? (
          <span className="text-xs text-slate-400">{items.length}</span>
        ) : null}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <UpcomingSkeleton />
        ) : error ? (
          <div className="px-5 py-6 text-sm">
            <p className="font-medium text-red-700">Impossible de charger les échéances.</p>
            <p className="mt-1 text-slate-500">{error.message}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">Aucune échéance prévue.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map(item => {
              const tBadge = milestoneType(item.type).badge
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50 sm:grid-cols-[6.5rem_5rem_1fr_auto_2rem]"
                  >
                    <span className="font-medium tabular-nums text-slate-900">
                      {formatDate(item.date)}
                    </span>
                    <span className={`hidden shrink-0 rounded px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${tBadge}`}>
                      {item.typeLabel}
                    </span>
                    <span className="truncate text-slate-900">
                      {item.title}
                      {item.context ? (
                        <span className="ml-2 text-xs text-slate-400">— {item.context}</span>
                      ) : null}
                    </span>
                    <span className="hidden shrink-0 text-slate-400 sm:inline">
                      {item.country ? countryFlag(item.country) : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function UpcomingSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map(i => (
        <li key={i} className="flex items-center gap-4 px-5 py-3">
          <span className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <span className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          <span className="h-5 w-16 animate-pulse rounded bg-slate-200" />
        </li>
      ))}
    </ul>
  )
}
