import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { deliverableStatus, formatDate, toneClass } from '../../lib/format'

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
      const { data, error } = await supabase
        .from('deliverables')
        .select(
          'id, title, due_date, status, funder:funders!inner(id, name, country, project_id)'
        )
        .eq('funder.project_id', projectId)
        .in('status', ['to_produce', 'in_progress'])
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(10)

      if (!alive) return

      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setItems(data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prochains dépôts aux bailleurs
        </h2>
        {!loading && !error ? (
          <span className="text-xs text-slate-400">{items.length}</span>
        ) : null}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <DeliverablesSkeleton />
        ) : error ? (
          <div className="px-5 py-6 text-sm">
            <p className="font-medium text-red-700">Impossible de charger les dépôts.</p>
            <p className="mt-1 text-slate-500">{error.message}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">Aucune échéance prévue.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map(item => {
              const status = deliverableStatus(item.status)
              return (
                <li key={item.id}>
                  <Link
                    to="/livrables"
                    className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50 sm:grid-cols-[7rem_10rem_1fr_auto]"
                  >
                    <span className="font-medium tabular-nums text-slate-900">
                      {formatDate(item.due_date)}
                    </span>
                    <span className="hidden truncate text-slate-500 sm:inline">
                      {item.funder?.name ?? '—'}
                    </span>
                    <span className="truncate text-slate-900">{item.title}</span>
                    <span
                      className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}
                    >
                      {status.label}
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

function DeliverablesSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map(i => (
        <li key={i} className="flex items-center gap-4 px-5 py-3">
          <span className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <span className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          <span className="h-5 w-20 animate-pulse rounded bg-slate-200" />
        </li>
      ))}
    </ul>
  )
}
