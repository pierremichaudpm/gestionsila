import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import {
  categoryBadgeClass,
  countryFlag,
  countryName,
  documentCategory,
  lotStatus,
  LOT_STATUS_OPTIONS,
  relativeTime,
  toneClass,
  validationStatus,
} from '../lib/format'
import CommentThread from '../components/comments/CommentThread.jsx'

export default function LotDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [lot, setLot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('documents')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState(null)

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('lots')
        .select('id, name, director, country, status, project_id, organization:organizations(id, name)')
        .eq('id', id)
        .maybeSingle()

      if (!alive) return
      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setLot(data)
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [id])

  const canEditStatus = !!lot && profile?.country === lot.country

  async function handleStatusChange(e) {
    const newStatus = e.target.value
    setSavingStatus(true)
    setStatusError(null)
    const { error } = await supabase
      .from('lots')
      .update({ status: newStatus })
      .eq('id', lot.id)
    setSavingStatus(false)
    if (error) {
      setStatusError(error.message)
      return
    }
    setLot(prev => ({ ...prev, status: newStatus }))
  }

  if (loading) {
    return <LotDetailSkeleton />
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p className="font-medium">Impossible de charger ce tableau.</p>
        <p className="mt-1 text-red-600">{error.message}</p>
      </div>
    )
  }
  if (!lot) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
        <p className="font-medium text-slate-900">Tableau introuvable.</p>
        <Link to="/lots" className="mt-2 inline-block text-brand-blue hover:underline">
          ← Retour aux tableaux
        </Link>
      </div>
    )
  }

  const status = lotStatus(lot.status)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/lots" className="text-sm text-slate-500 hover:text-brand-navy">
          ← Tableaux
        </Link>
      </div>

      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <span
            title={countryName(lot.country)}
            aria-label={countryName(lot.country)}
            className="text-2xl leading-none"
          >
            {countryFlag(lot.country)}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-brand-navy">{lot.name}</h1>
            {lot.director ? (
              <p className="mt-1 text-sm text-slate-600">Réalisatrice : {lot.director}</p>
            ) : null}
            <p className="mt-1 text-sm text-slate-500">
              {lot.organization?.name ?? '—'} · {countryName(lot.country)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {canEditStatus ? (
              <>
                <label className="text-xs uppercase tracking-wide text-slate-500" htmlFor="status">
                  Statut
                </label>
                <select
                  id="status"
                  value={lot.status}
                  onChange={handleStatusChange}
                  disabled={savingStatus}
                  className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-60"
                >
                  {LOT_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{lotStatus(s).label}</option>
                  ))}
                </select>
                {statusError ? (
                  <p className="text-xs text-red-600">{statusError}</p>
                ) : null}
              </>
            ) : (
              <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${toneClass(status.tone)}`}>
                {status.label}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
            Documents
          </TabButton>
          <TabButton active={tab === 'livrables'} onClick={() => setTab('livrables')}>
            Livrables
          </TabButton>
        </nav>
      </div>

      {tab === 'documents' ? (
        <LotDocuments lotId={lot.id} />
      ) : (
        <LotLivrables />
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <CommentThread
          projectId={lot.project_id}
          entityType="lot"
          entityId={lot.id}
        />
      </section>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
        active
          ? 'border-brand-navy text-brand-navy'
          : 'border-transparent text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function LotDocuments({ lotId }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, category, country, version, validation_status, drive_url, updated_at')
        .eq('lot_id', lotId)
        .order('updated_at', { ascending: false })
      if (!alive) return
      if (error) {
        setError(error)
        setLoading(false)
        return
      }
      setDocs(data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [lotId])

  if (loading) return <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error.message}
      </p>
    )
  }
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Aucun document pour ce tableau.</p>
        <p className="mt-1">
          <Link to="/documents" className="text-brand-blue hover:underline">
            Ajouter le premier document depuis la page Documents →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
      {docs.map(doc => {
        const v = validationStatus(doc.validation_status)
        return (
          <li key={doc.id} className="flex items-center gap-4 px-5 py-3 text-sm">
            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClass(doc.category)}`}>
              {documentCategory(doc.category)}
            </span>
            <span className="flex-1 truncate font-medium text-slate-900">
              {doc.title} <span className="text-slate-400">v{doc.version}</span>
            </span>
            <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(v.tone)}`}>
              {v.label}
            </span>
            <span className="hidden text-xs text-slate-400 sm:inline">{relativeTime(doc.updated_at)}</span>
            <a
              href={doc.drive_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-blue hover:underline"
            >
              Drive ↗
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function LotLivrables() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">Livrables non liés aux tableaux.</p>
      <p className="mt-1">
        Les livrables sont actuellement rattachés aux bailleurs (voir{' '}
        <Link to="/livrables" className="text-brand-blue hover:underline">page Livrables</Link>
        ). Le lien direct tableau ↔ livrable nécessite une migration de schéma à venir.
      </p>
    </div>
  )
}

function LotDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
    </div>
  )
}
