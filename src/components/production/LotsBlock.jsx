import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { countryFlag, countryName, lotStatus, toneClass } from '../../lib/format'

export default function LotsBlock({ projectId }) {
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
        .select('id, name, director, country, status, sort_order, documents(count), milestones(count)')
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
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tableaux</h2>
        {!loading && !error ? (
          <span className="text-xs text-slate-400">{lots.length}</span>
        ) : null}
      </div>
      {loading ? (
        <LotsSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
          <p className="font-medium text-red-700">Impossible de charger les tableaux.</p>
          <p className="mt-1 text-slate-500">{error.message}</p>
        </div>
      ) : lots.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Aucun tableau pour l'instant.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {lots.map(lot => <LotCard key={lot.id} lot={lot} />)}
        </div>
      )}
    </section>
  )
}

function LotCard({ lot }) {
  const status = lotStatus(lot.status)
  const docCount = lot.documents?.[0]?.count ?? 0
  const msCount = lot.milestones?.[0]?.count ?? 0
  return (
    <Link
      to={`/lots/${lot.id}`}
      className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          title={countryName(lot.country)}
          aria-label={countryName(lot.country)}
          className="text-lg leading-none"
        >
          {countryFlag(lot.country)}
        </span>
        <span
          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}
        >
          {status.label}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-navy">
        {lot.name}
      </h3>
      {lot.director ? (
        <p className="mt-1 text-xs text-slate-500">{lot.director}</p>
      ) : null}
      <div className="mt-auto pt-3 text-xs text-slate-500">
        {docCount} {docCount > 1 ? 'docs' : 'doc'} · {msCount} {msCount > 1 ? 'jalons' : 'jalon'}
      </div>
    </Link>
  )
}

function LotsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  )
}
