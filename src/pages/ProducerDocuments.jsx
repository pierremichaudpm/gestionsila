import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject.js'
import {
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  PRODUCER_FOLDER_OPTIONS,
  producerFolder,
  relativeTime,
  toneClass,
  validationStatus,
  VALIDATION_STATUS_OPTIONS,
} from '../lib/format'
import NewProducerDocumentModal from '../components/producers/NewProducerDocumentModal.jsx'
import EditProducerDocumentModal from '../components/producers/EditProducerDocumentModal.jsx'
import CommentThread from '../components/comments/CommentThread.jsx'
import CommentBadge from '../components/comments/CommentBadge.jsx'
import { useCommentCounts } from '../components/comments/useCommentCounts.js'

const VALID_FOLDERS = new Set(PRODUCER_FOLDER_OPTIONS)

export default function ProducerDocuments() {
  const params = useParams()
  const { projectId, accessLevel, hasProducerAccess, loading: projectLoading } = useCurrentProject()
  const { profile } = useAuth()
  const folder = params.folder

  const [docs, setDocs] = useState([])
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ lot: '', status: '', country: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [commentBump, setCommentBump] = useState(0)

  const folderValid = VALID_FOLDERS.has(folder)

  useEffect(() => {
    if (!projectId || !folderValid) return
    let alive = true

    async function load() {
      setLoading(true)
      setError(null)
      const [docsRes, lotsRes] = await Promise.all([
        supabase
          .from('producer_documents')
          .select('id, title, folder, country, version, validation_status, drive_url, lot_id, uploaded_by, updated_at, lot:lots(id, name)')
          .eq('project_id', projectId)
          .eq('folder', folder)
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
  }, [projectId, folder, folderValid, reloadKey])

  useEffect(() => {
    setFilters({ lot: '', status: '', country: '' })
    setExpandedId(null)
  }, [folder])

  const filtered = useMemo(() => {
    return docs.filter(d => {
      if (filters.lot === 'transversal' && d.lot_id) return false
      if (filters.lot && filters.lot !== 'transversal' && d.lot_id !== filters.lot) return false
      if (filters.status && d.validation_status !== filters.status) return false
      if (filters.country && d.country !== filters.country) return false
      return true
    })
  }, [docs, filters])

  const visibleIds = useMemo(() => filtered.map(d => d.id), [filtered])
  const commentCounts = useCommentCounts(projectId, 'producer_document', visibleIds, commentBump)

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  async function handleAction(doc, nextStatus) {
    setActionError(null)
    const { error } = await supabase
      .from('producer_documents')
      .update({ validation_status: nextStatus })
      .eq('id', doc.id)
    if (error) {
      setActionError(error.message)
      return
    }
    setReloadKey(k => k + 1)
  }

  if (projectLoading) {
    return <PageSkeleton />
  }
  // L'accès est déjà filtré par RLS côté serveur, mais on évite d'afficher
  // une page vide ambigüe : redirection si l'utilisateur n'a pas d'accès,
  // ou si le folder dans l'URL est invalide.
  if (!hasProducerAccess || !folderValid) {
    return <Navigate to="/production" replace />
  }

  const meta = producerFolder(folder)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Espace Producteurs</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-navy">{meta.label}</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.description}.</p>
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

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} />
      ) : filtered.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Tableau</th>
                <th className="px-3 py-2">Pays</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Modifié</th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(doc => (
                <ProducerDocumentRow
                  key={doc.id}
                  doc={doc}
                  profile={profile}
                  accessLevel={accessLevel}
                  onAction={handleAction}
                  onEdit={(d) => setEditingDoc(d)}
                  commentCount={commentCounts.get(doc.id) ?? 0}
                  expanded={expandedId === doc.id}
                  onToggle={() => setExpandedId(prev => prev === doc.id ? null : doc.id)}
                  projectId={projectId}
                  onCommentChange={() => setCommentBump(b => b + 1)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewProducerDocumentModal
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

      <EditProducerDocumentModal
        open={!!editingDoc}
        doc={editingDoc}
        lots={lots}
        accessLevel={accessLevel}
        onClose={() => setEditingDoc(null)}
        onSaved={() => { setEditingDoc(null); setReloadKey(k => k + 1) }}
        onDeleted={() => { setEditingDoc(null); setReloadKey(k => k + 1) }}
      />
    </div>
  )
}

function Filters({ filters, onChange, lots }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
      <FilterSelect label="Tableau" value={filters.lot} onChange={(v) => onChange('lot', v)}>
        <option value="">Tous les tableaux</option>
        <option value="transversal">Transversal</option>
        {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </FilterSelect>
      <FilterSelect label="Statut" value={filters.status} onChange={(v) => onChange('status', v)}>
        <option value="">Tous</option>
        {VALIDATION_STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{validationStatus(s).label}</option>
        ))}
      </FilterSelect>
      <FilterSelect label="Pays" value={filters.country} onChange={(v) => onChange('country', v)}>
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

function ProducerDocumentRow({ doc, profile, accessLevel, onAction, onEdit, commentCount, expanded, onToggle, projectId, onCommentChange }) {
  const v = validationStatus(doc.validation_status)
  const isMyCountry = profile?.country === doc.country
  const isAdmin = accessLevel === 'admin'
  const isApprover = accessLevel === 'admin' || accessLevel === 'coproducer'
  const canEdit = isAdmin || ((accessLevel === 'coproducer' || accessLevel === 'production_manager') && isMyCountry)

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
          {canEdit && onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(doc)}
              className="mr-2 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:border-brand-blue hover:text-brand-blue"
            >
              Modifier
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
          <td colSpan={8} className="px-5 py-4">
            <CommentThread
              projectId={projectId}
              entityType="producer_document"
              entityId={doc.id}
              onCountChange={onCommentChange}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function PageSkeleton() {
  return <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {[0, 1, 2, 3].map(i => (
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
        {hasFilters ? 'Aucun document ne correspond aux filtres.' : 'Aucun document confidentiel pour ce sous-dossier.'}
      </p>
      <p className="mt-1">
        {hasFilters
          ? 'Modifiez ou réinitialisez les filtres.'
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
