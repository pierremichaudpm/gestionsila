import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { relativeTime } from '../../lib/format'

export default function RecentActivityBlock({ projectId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('activity_log')
        .select('id, action, entity_type, entity_id, metadata, created_at, user:users(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
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
          Activité récente
        </h2>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <ActivitySkeleton />
        ) : error ? (
          <div className="px-5 py-6 text-sm">
            <p className="font-medium text-red-700">Impossible de charger l'activité.</p>
            <p className="mt-1 text-slate-500">{error.message}</p>
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">Aucune activité récente.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map(item => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm"
              >
                <p className="truncate text-slate-900">
                  <span className="font-medium">
                    {item.user?.full_name ?? 'Utilisateur inconnu'}
                  </span>{' '}
                  <span className="text-slate-600">{describe(item)}</span>
                </p>
                <span className="shrink-0 text-xs text-slate-400">
                  {relativeTime(item.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function describe(item) {
  const subject =
    item.metadata?.title ??
    item.metadata?.name ??
    item.metadata?.category ??
    null
  const suffix = subject ? ` : ${subject}` : ''
  const verb = ACTION_LABELS[item.action] ?? item.action
  const target = ENTITY_LABELS[item.entity_type] ?? item.entity_type
  return `${verb} ${target}${suffix}`
}

const ACTION_LABELS = {
  created:   'a créé',
  updated:   'a modifié',
  deleted:   'a supprimé',
  submitted: 'a soumis pour validation',
  approved:  'a approuvé',
  archived:  'a archivé',
  added:     'a ajouté',
}

const ENTITY_LABELS = {
  document:    'un document',
  lot:         'un lot',
  task:        'une tâche',
  funder:      'un bailleur',
  deliverable: 'un livrable',
  milestone:   'un jalon',
  budget_line: 'une ligne de budget',
  user:        'un utilisateur',
}

function ActivitySkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-4 px-5 py-3">
          <span className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          <span className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        </li>
      ))}
    </ul>
  )
}
