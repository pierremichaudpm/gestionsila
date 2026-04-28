import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject'
import {
  categoryBadgeClass,
  countryFlag,
  countryName,
  documentCategory,
  documentFolder,
  COUNTRY_OPTIONS,
  DOCUMENT_FOLDER_OPTIONS,
  relativeTime,
  toneClass,
  validationStatus,
  VALIDATION_STATUS_OPTIONS,
} from '../lib/format'
import NewDocumentModal from '../components/documents/NewDocumentModal.jsx'
import CommentThread from '../components/comments/CommentThread.jsx'
import CommentBadge from '../components/comments/CommentBadge.jsx'
import { useCommentCounts } from '../components/comments/useCommentCounts.js'

const PAGE_SIZE = 25
const VALID_FOLDERS = new Set(DOCUMENT_FOLDER_OPTIONS)

export default function Documents() {
  const params = useParams()
  const navigate = useNavigate()
  const { projectId, accessLevel, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const [docs, setDocs] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ lot: '', status: '', country: '' })
  const [sort, setSort] = useState({ key: 'updated_at', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [commentBump, setCommentBump] = useState(0)

  // Folder courant : vient de l'URL (/documents/:folder). Si invalide, on
  // retombe sur la grille des sous-dossiers.
  const folder = params.folder && VALID_FOLDERS.has(params.folder) ? params.folder : null

  useEffect(() => {
    if (!projectId) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [docsRes, lotsRes] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, category, folder, country, version, validation_status, drive_url, lot_id, uploaded_by, updated_at, lot:lots(id, name)')
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

  // Reset filters/page/expanded en changeant de sous-dossier.
  useEffect(() => {
    setFilters({ lot: '', status: '', country: '' })
    setPage(0)
    setExpandedId(null)
  }, [folder])

  const folderCounts = useMemo(() => {
    const counts = Object.fromEntries(DOCUMENT_FOLDER_OPTIONS.map(f => [f, 0]))
    for (const d of docs) counts[d.folder] = (counts[d.folder] ?? 0) + 1
    return counts
  }, [docs])

  const filtered = useMemo(() => {
    return docs.filter(d => {
      if (folder && d.folder !== folder) return false
      if (filters.lot === 'transversal' && d.lot_id) return false
      if (filters.lot && filters.lot !== 'transversal' && d.lot_id !== filters.lot) return false
      if (filters.status && d.validation_status !== filters.status) return false
      if (filters.country && d.country !== filters.country) return false
      return true
    })
  }, [docs, filters, folder])

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
  const visibleIds = useMemo(() => visibleDocs.map(d => d.id), [visibleDocs])
  const commentCounts = useCommentCounts(projectId, 'document', visibleIds, commentBump)

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

  // Si l'URL pointe sur un folder invalide, on redirige vers la grille.
  useEffect(() => {
    if (params.folder && !VALID_FOLDERS.has(params.folder)) {
      navigate('/documents', { replace: true })
    }
  }, [params.folder, navigate])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {folder ? (
            <>
              <nav className="text-xs text-slate-500">
                <Link to="/documents" className="hover:text-brand-blue hover:underline">Documents</Link>
                <span className="mx-1.5 text-slate-400">›</span>
                <span className="text-slate-700">{documentFolder(folder).label}</span>
              </nav>
              <h1 className="mt-1 text-2xl font-semibold text-brand-navy">
                {documentFolder(folder).label}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {documentFolder(folder).description}.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-brand-navy">Documents</h1>
              <p className="mt-1 text-sm text-slate-500">
                Choisissez un sous-dossier pour accéder aux fiches. Les fichiers restent sur Google Drive — l'outil sert à les retrouver, classer et valider.
              </p>
            </>
          )}
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

      {projectLoading || loading ? (
        folder ? <TableSkeleton /> : <FoldersSkeleton />
      ) : error ? (
        <ErrorState error={error} />
      ) : !folder ? (
        <FoldersGrid counts={folderCounts} />
      ) : (
        <ListView
          actionError={actionError}
          filters={filters}
          updateFilter={updateFilter}
          lots={lots}
          sorted={sorted}
          visibleDocs={visibleDocs}
          totalPages={totalPages}
          page={page}
          setPage={setPage}
          sort={sort}
          toggleSort={toggleSort}
          profile={profile}
          accessLevel={accessLevel}
          handleAction={handleAction}
          commentCounts={commentCounts}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          projectId={projectId}
          onCommentChange={() => setCommentBump(b => b + 1)}
        />
      )}

      <NewDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        userCountry={profile?.country}
        userId={profile?.id}
        lots={lots}
        defaultFolder={folder}
        onCreated={() => {
          setModalOpen(false)
          setReloadKey(k => k + 1)
        }}
      />
    </div>
  )
}

function FoldersGrid({ counts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {DOCUMENT_FOLDER_OPTIONS.map(f => {
        const meta = documentFolder(f)
        const count = counts[f] ?? 0
        return (
          <Link
            key={f}
            to={`/documents/${f}`}
            className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:shadow"
          >
            <div className="flex items-start justify-between">
              <FolderIcon folder={f} />
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {count}
              </span>
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-brand-navy">
              {meta.label}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
          </Link>
        )
      })}
    </div>
  )
}

function FolderIcon({ folder }) {
  const cls = 'flex h-10 w-10 items-center justify-center rounded-lg text-lg'
  switch (folder) {
    case 'techno':
      return <span className={`${cls} bg-orange-50 text-orange-700`} aria-hidden="true">⚙️</span>
    case 'creation':
      return <span className={`${cls} bg-fuchsia-50 text-fuchsia-700`} aria-hidden="true">🎨</span>
    case 'texte':
      return <span className={`${cls} bg-blue-50 text-blue-700`} aria-hidden="true">📄</span>
    case 'divers':
    default:
      return <span className={`${cls} bg-slate-100 text-slate-600`} aria-hidden="true">📁</span>
  }
}

function ListView({
  actionError,
  filters,
  updateFilter,
  lots,
  sorted,
  visibleDocs,
  totalPages,
  page,
  setPage,
  sort,
  toggleSort,
  profile,
  accessLevel,
  handleAction,
  commentCounts,
  expandedId,
  setExpandedId,
  projectId,
  onCommentChange,
}) {
  return (
    <>
      <Filters filters={filters} onChange={updateFilter} lots={lots} />

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortHeader label="Titre" sortKey="title" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Catégorie" sortKey="category" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Tableau" sortKey="lot" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Pays" sortKey="country" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Version" sortKey="version" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Statut" sortKey="validation_status" sort={sort} onClick={toggleSort} />
                  <SortHeader label="Modifié" sortKey="updated_at" sort={sort} onClick={toggleSort} />
                  <th className="px-3 py-2"></th>
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
                    commentCount={commentCounts.get(doc.id) ?? 0}
                    expanded={expandedId === doc.id}
                    onToggle={() => setExpandedId(prev => prev === doc.id ? null : doc.id)}
                    projectId={projectId}
                    onCommentChange={onCommentChange}
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
    </>
  )
}

function Filters({ filters, onChange, lots }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <FilterSelect
        label="Tableau"
        value={filters.lot}
        onChange={(v) => onChange('lot', v)}
      >
        <option value="">Tous les tableaux</option>
        <option value="transversal">Transversal</option>
        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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

function DocumentRow({ doc, profile, accessLevel, onAction, commentCount, expanded, onToggle, projectId, onCommentChange }) {
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
    <>
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
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="rounded px-1.5 py-1 hover:bg-slate-100"
            title={expanded ? 'Masquer les commentaires' : 'Afficher les commentaires'}
          >
            <CommentBadge count={commentCount} />
          </button>
        </td>
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
      {expanded ? (
        <tr className="bg-slate-50/60">
          <td colSpan={9} className="px-5 py-4">
            <CommentThread
              projectId={projectId}
              entityType="document"
              entityId={doc.id}
              onCountChange={onCommentChange}
            />
          </td>
        </tr>
      ) : null}
    </>
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

function FoldersSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
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
        {hasFilters ? 'Aucun document ne correspond aux filtres.' : 'Aucun document dans ce sous-dossier.'}
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
