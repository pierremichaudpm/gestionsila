import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { countryFlag, countryName, lotStatus, toneClass } from '../../lib/format'

export default function LotsBlock({ projectId }) {
  const [lots, setLots] = useState([])
  const [transversalCounts, setTransversalCounts] = useState({ docs: 0, milestones: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)

      const [lotsRes, docsRes, msRes] = await Promise.all([
        supabase
          .from('lots')
          .select('id, name, director, country, status, sort_order, documents(count), milestones(count)')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .is('lot_id', null),
        supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .is('lot_id', null),
      ])

      if (!alive) return

      if (lotsRes.error) {
        setError(lotsRes.error)
        setLoading(false)
        return
      }
      setLots(lotsRes.data ?? [])
      setTransversalCounts({
        docs: docsRes.count ?? 0,
        milestones: msRes.count ?? 0,
      })
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
          <span className="text-xs text-slate-400">{lots.length} + global</span>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <GlobalCard
            docCount={transversalCounts.docs}
            milestoneCount={transversalCounts.milestones}
          />
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

// Card "Global" : agrège les documents et jalons sans tableau (lot_id NULL).
// Lien vers /documents (la grille des sous-dossiers documentaires) — c'est
// la destination la plus naturelle pour parcourir les pièces transversales.
function GlobalCard({ docCount, milestoneCount }) {
  return (
    <Link
      to="/documents"
      className="group flex h-full flex-col rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 shadow-sm transition hover:border-brand-blue hover:bg-white hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          title="Transversal — pièces sans tableau spécifique"
          aria-label="Transversal"
          className="text-lg leading-none"
        >
          🌐
        </span>
        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          Transversal
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-brand-navy">
        Global
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Documents et jalons sans tableau spécifique
      </p>
      <div className="mt-auto pt-3 text-xs text-slate-500">
        {docCount} {docCount > 1 ? 'docs' : 'doc'} · {milestoneCount} {milestoneCount > 1 ? 'jalons' : 'jalon'}
      </div>
    </Link>
  )
}

function LotsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  )
}
