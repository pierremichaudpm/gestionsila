import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  categoryBadgeClass,
  countryFlag,
  countryName,
  documentCategory,
  DOCUMENT_CATEGORY_OPTIONS,
  COUNTRY_OPTIONS,
  relativeTime,
  toneClass,
  validationStatus,
  VALIDATION_STATUS_OPTIONS,
} from '../lib/format'
import NewDocumentModal from '../components/documents/NewDocumentModal.jsx'

const PAGE_SIZE = 25

export default function Documents() {
  const { projectId, accessLevel, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const [docs, setDocs] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ lot: '', category: '', status: '', country: '' })
  const [sort, setSort] = useState({ key: 'updated_at', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [docsRes, lotsRes] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, category, country, version, validation_status, drive_url, lot_id, uploaded_by, updated_at, lot:lots(id, name)')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('lots')
          .select('id, name')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
      ])

      if (!alive) return
      if (docsRes.error || lotsRes.error) {
        setError(docsRes.error ?? lotsRes.error)
        setLoading(false)
        return
      }
      setDocs(docsRes.data ?? [])
      setLots(lotsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => { alive = false }
  }, [projectId, reloadKey])

  const filtered = useMemo(() => {
    return docs.filter(d => {
      if (filters.lot === 'transversal' && d.lot_id) return false
      if (filters.lot && filters.lot !== 'transversal' && d.lot_id !== filters.lot) return false
      if (filters.category && d.category !== filters.category) return false
      if (filters.status && d.validation_status !== filters.status) return false
      if (filters.country && d.country !== filters.country) return false
      return true
    })
  }, [docs, filters])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, dir } = sort
    arr.sort((a, b) => {
      const av = key === 'lot' ? (a.lot?.name ?? '') : (a[key] ?? '')
      const bv = key === 'lot' ? (b.lot?.name ?? '') : (b[key] ?? '')
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const visibleDocs = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' })
    setPage(0)
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  async function handleAction(doc, nextStatus) {
    setActionError(null)
    const { error } = await supabase
      .from('documents')
      .update({ validation_status: nextStatus })
      .eq('id', doc.id)
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
          <h1 className="text-2xl font-semibold text-brand-navy">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fiches documentaires liées à Google Drive. Cliquez sur "Drive" pour ouvrir le fichier.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!projectId || !profile}
          className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          + Nouveau document
        </button>
      </header>

      <Filters filters={filters} onChange={updateFilter} lots={lots} />

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {projectLoading || loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} />
      ) : sorted.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortHeader label="Titre" sortKey="title" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Catégorie" sortKey="category" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Lot" sortKey="lot" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Pays" sortKey="country" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Version" sortKey="version" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Statut" sortKey="validation_status" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Modifié" sortKey="updated_at" sort={sort} onClick={toggleSort} />
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleDocs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    profile={profile}
                    accessLevel={accessLevel}
                    onAction={handleAction}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={sorted.length} />
          ) : (
            <p className="text-xs text-slate-400">{sorted.length} {sorted.length > 1 ? 'documents' : 'document'}</p>
          )}
        </>
      )}

      <NewDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        userCountry={profile?.country}
        userId={profile?.id}
        lots={lots}
        onCreated={() => {
          setModalOpen(false)
          setReloadKey(k => k + 1)
        }}
      />
    </div>
  )
}

function Filters({ filters, onChange, lots }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
      <FilterSelect
        label="Lot"
        value={filters.lot}
        onChange={(v) => onChange('lot', v)}
      >
        <option value="">Tous les lots</option>
        <option value="transversal">Transversal</option>
        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </FilterSelect>
      <FilterSelect
        label="Catégorie"
        value={filters.category}
        onChange={(v) => onChange('category', v)}
      >
        <option value="">Toutes</option>
        {DOCUMENT_CATEGORY_OPTIONS.map(c => (
          <option key={c} value={c}>{documentCategory(c)}</option>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Statut"
        value={filters.status}
        onChange={(v) => onChange('status', v)}
      >
        <option value="">Tous</option>
        {VALIDATION_STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{validationStatus(s).label}</option>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Pays"
        value={filters.country}
        onChange={(v) => onChange('country', v)}
      >
        <option value="">Tous</option>
        {COUNTRY_OPTIONS.map(c => (
          <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
        ))}
      </FilterSelect>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        {children}
      </select>
    </label>
  )
}

function SortHeader({ label, sortKey, sort, onClick }) {
  const active = sort.key === sortKey
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-700"
      >
        {label}
        {active ? (
          <span className="text-slate-400">{sort.dir === 'asc' ? '▲' : '▼'}</span>
        ) : null}
      </button>
    </th>
  )
}

function DocumentRow({ doc, profile, accessLevel, onAction }) {
  const v = validationStatus(doc.validation_status)
  const isMyCountry = profile?.country === doc.country
  const isAdmin = accessLevel === 'admin'
  const isApprover = accessLevel === 'admin' || accessLevel === 'coproducer'

  let action = null
  if (doc.validation_status === 'draft' && isMyCountry) {
    action = { label: 'Soumettre', next: 'pending' }
  } else if (doc.validation_status === 'pending' && isMyCountry && isApprover) {
    action = { label: 'Approuver', next: 'approved' }
  } else if (doc.validation_status === 'approved' && isAdmin) {
    action = { label: 'Archiver', next: 'archived' }
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-2 font-medium text-slate-900">
        <div className="truncate">{doc.title}</div>
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClass(doc.category)}`}>
          {documentCategory(doc.category)}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-600">
        {doc.lot?.name ?? <span className="italic text-slate-400">Transversal</span>}
      </td>
      <td className="px-3 py-2">
        <span title={countryName(doc.country)}>{countryFlag(doc.country)}</span>
      </td>
      <td className="px-3 py-2 text-slate-600">v{doc.version}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(v.tone)}`}>
          {v.label}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate-400">{relativeTime(doc.updated_at)}</td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        {action ? (
          <button
            type="button"
            onClick={() => onAction(doc, action.next)}
            className="mr-2 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-brand-blue hover:text-brand-blue"
          >
            {action.label}
          </button>
        ) : null}
        <a
          href={doc.drive_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-blue hover:underline"
        >
          Drive ↗
        </a>
      </td>
    </tr>
  )
}

function Pagination({ page, totalPages, onChange, total }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{total} {total > 1 ? 'documents' : 'document'} · page {page + 1} / {totalPages}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded border border-slate-300 px-2 py-1 hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Préc.
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="rounded border border-slate-300 px-2 py-1 hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          Suiv. →
        </button>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <p className="font-medium text-slate-900">
        {hasFilters ? 'Aucun document ne correspond aux filtres.' : 'Aucun document pour ce projet.'}
      </p>
      <p className="mt-1">
        {hasFilters
          ? 'Essayez de modifier ou réinitialiser les filtres.'
          : 'Ajoutez le premier document via le bouton "+ Nouveau document".'}
      </p>
    </div>
  )
}

function ErrorState({ error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-medium">Impossible de charger les documents.</p>
      <p className="mt-1 text-red-600">{error.message}</p>
    </div>
  )
}
