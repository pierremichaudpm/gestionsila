import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  countryFlag,
  countryName,
  lotStatus,
  toneClass,
} from '../lib/format'

export default function Lots() {
  const { projectId, loading: projectLoading } = useCurrentProject()
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('lots')
        .select('id, name, director, country, status, sort_order, organization:organizations(id, name), documents(count)')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (!alive) return
      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setLots(data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Tableaux</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tableaux de la production. Cliquez sur un tableau pour voir ses documents et livrables.
        </p>
      </header>

      {projectLoading || loading ? (
        <LotsGridSkeleton />
      ) : error ? (
        <ErrorState error={error} />
      ) : lots.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map(lot => <LotCard key={lot.id} lot={lot} />)}
        </div>
      )}
    </div>
  )
}

function LotCard({ lot }) {
  const status = lotStatus(lot.status)
  const docCount = lot.documents?.[0]?.count ?? 0
  return (
    <Link
      to={`/lots/${lot.id}`}
      className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          title={countryName(lot.country)}
          aria-label={countryName(lot.country)}
          className="text-xl leading-none"
        >
          {countryFlag(lot.country)}
        </span>
        <span
          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}
        >
          {status.label}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-brand-navy">
        {lot.name}
      </h3>
      {lot.director ? (
        <p className="mt-1 text-xs text-slate-500">{lot.director}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="truncate">{lot.organization?.name ?? '—'}</span>
        <span className="shrink-0">{docCount} {docCount > 1 ? 'docs' : 'doc'}</span>
      </div>
    </Link>
  )
}

function LotsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger les tableaux.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">Aucun tableau pour ce projet.</p>
      <p className="mt-1">Les tableaux apparaîtront ici une fois créés.</p>
    </div>
  )
}
