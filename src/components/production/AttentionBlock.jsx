import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  daysUntil,
  documentCategory,
  formatDate,
  milestoneType,
  relativeTime,
  toneClass,
} from '../../lib/format'

const WINDOW_DAYS = 14

export default function AttentionBlock({ projectId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const horizon = new Date()
      horizon.setDate(horizon.getDate() + WINDOW_DAYS)
      const horizonDate = horizon.toISOString().slice(0, 10)

      const { data: userData } = await supabase.auth.getUser()
      const currentUserId = userData?.user?.id ?? null

      const deliverablesQ = supabase
        .from('deliverables')
        .select(
          'id, title, due_date, status, funder:funders!inner(id, name, country, project_id)'
        )
        .eq('funder.project_id', projectId)
        .in('status', ['to_produce', 'in_progress'])
        .lte('due_date', horizonDate)
        .order('due_date', { ascending: true })

      // Pour les jalons ponctuels (end_date NULL), c'est start_date qui sert
      // de deadline. Les jalons archivés ne remontent pas (archived=false).
      const milestonesQ = supabase
        .from('milestones')
        .select('id, title, start_date, end_date, type, country')
        .eq('project_id', projectId)
        .eq('archived', false)
        .or(`end_date.lte.${horizonDate},and(end_date.is.null,start_date.lte.${horizonDate})`)
        .order('start_date', { ascending: true })

      const documentsQ = currentUserId
        ? supabase
            .from('documents')
            .select('id, title, category, country, uploaded_by, updated_at')
            .eq('project_id', projectId)
            .eq('validation_status', 'pending')
            .neq('uploaded_by', currentUserId)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null })

      const [deliverablesRes, milestonesRes, documentsRes] = await Promise.all([
        deliverablesQ,
        milestonesQ,
        documentsQ,
      ])
      if (!alive) return

      if (deliverablesRes.error || milestonesRes.error || documentsRes.error) {
        setError(deliverablesRes.error ?? milestonesRes.error ?? documentsRes.error)
        setLoading(false)
        return
      }

      const deliverableItems = (deliverablesRes.data ?? []).map(d => {
        const days = daysUntil(d.due_date)
        const overdue = days !== null && days < 0
        return {
          kind: 'deliverable',
          id: d.id,
          urgency: overdue ? 0 : 1,
          badge: badgeForDays(days, overdue),
          tone: overdue ? 'late' : 'warn',
          title: d.title,
          context: d.funder?.name ?? '—',
          date: formatDate(d.due_date),
          to: '/livrables',
        }
      })

      const milestoneItems = (milestonesRes.data ?? []).map(m => {
        const deadline = m.end_date ?? m.start_date
        const days = daysUntil(deadline)
        const overdue = days !== null && days < 0
        return {
          kind: 'milestone',
          id: m.id,
          urgency: overdue ? 0 : 1,
          badge: badgeForDays(days, overdue),
          tone: overdue ? 'late' : 'warn',
          title: m.title,
          context: milestoneType(m.type).label,
          date: formatDate(deadline),
          to: '/calendrier',
        }
      })

      const documentItems = (documentsRes.data ?? []).map(doc => ({
        kind: 'document',
        id: doc.id,
        urgency: 2,
        badge: 'À valider',
        tone: 'warn',
        title: doc.title,
        context: documentCategory(doc.category),
        date: relativeTime(doc.updated_at),
        to: '/documents',
      }))

      setItems(
        [...deliverableItems, ...milestoneItems, ...documentItems]
          .sort((a, b) => a.urgency - b.urgency)
      )
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  return (
    <section>
      <SectionHeader title="Attention requise" count={!loading && !error ? items.length : null} />
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <AttentionSkeleton />
        ) : error ? (
          <ErrorState error={error} />
        ) : items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-600">
            Rien à signaler. Toutes les échéances sont sous contrôle.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map(item => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  to={item.to}
                  className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-slate-50"
                >
                  <span
                    className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium ${toneClass(item.tone)}`}
                  >
                    {item.badge}
                  </span>
                  <span className="flex-1 truncate font-medium text-slate-900">{item.title}</span>
                  <span className="hidden text-slate-500 sm:inline">{item.context}</span>
                  <span className="shrink-0 text-slate-400">{item.date}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function badgeForDays(days, overdue) {
  if (overdue) return 'En retard'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} j.`
}

function SectionHeader({ title, count }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {count !== null && count !== undefined ? (
        <span className="text-xs text-slate-400">
          {count} {count > 1 ? 'éléments' : 'élément'}
        </span>
      ) : null}
    </div>
  )
}

function AttentionSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {[0, 1, 2].map(i => (
        <li key={i} className="flex items-center gap-4 px-5 py-3">
          <span className="h-5 w-20 animate-pulse rounded bg-slate-200" />
          <span className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          <span className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </li>
      ))}
    </ul>
  )
}

function ErrorState({ error }) {
  return (
    <div className="px-5 py-6 text-sm">
      <p className="font-medium text-red-700">Impossible de charger cette section.</p>
      <p className="mt-1 text-slate-500">{error?.message ?? 'Erreur inconnue'}</p>
    </div>
  )
}
