import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  categoryBadgeClass,
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  documentCategory,
  DOCUMENT_CATEGORY_OPTIONS,
  documentFolder,
  DOCUMENT_FOLDER_OPTIONS,
  toneClass,
  validationStatus,
  VALIDATION_STATUS_OPTIONS,
} from '../../lib/format'
import SlideOver from '../ui/SlideOver.jsx'

// Recherche cross-folders dans les Documents publics. NE PAS inclure
// Espace Producteurs (assurances / legal / devis_initiaux) — c'est une
// recherche pour les documents publics seulement.
//
// Champ texte : ilike sur title et version (string). Debounced 300ms.
// Filtres optionnels : Tableau, Pays, Catégorie, Statut, Sous-dossier.
// Clic sur un résultat → onPickDocument(doc) (le parent ouvre l'édition).

const DEBOUNCE_MS = 300

export default function DocumentSearchPanel({
  open,
  onClose,
  projectId,
  lots,
  onPickDocument,
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filters, setFilters] = useState({
    folder: '',
    lot: '',
    status: '',
    country: '',
    category: '',
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset à la fermeture pour repartir vierge à la prochaine ouverture.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
      setFilters({ folder: '', lot: '', status: '', country: '', category: '' })
      setResults([])
      setError(null)
    }
  }, [open])

  // Debounce la requête utilisateur.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  // Lance la requête à chaque changement de query debounced ou de filtre.
  // On affiche les résultats même sans texte tant qu'au moins un filtre est
  // actif (cohérent avec la liste de la page Documents qui filtre sans
  // recherche). Sinon liste vide pour ne pas afficher tout par défaut.
  useEffect(() => {
    if (!open || !projectId) return
    const hasQuery = debouncedQuery.length > 0
    const hasFilter = Object.values(filters).some(Boolean)
    if (!hasQuery && !hasFilter) {
      setResults([])
      return
    }

    let alive = true
    setLoading(true)
    setError(null)

    let req = supabase
      .from('documents')
      .select('id, title, category, folder, country, version, validation_status, drive_url, lot_id, updated_at, lot:lots(id, name)')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (hasQuery) {
      // documents.version est un int : pas d'ilike possible. On combine
      // title.ilike (toujours) avec version.eq quand la requête ressemble
      // à un numéro de version (« v2 », « 10 », etc.).
      const escaped = debouncedQuery.replace(/[%_,]/g, m => `\\${m}`)
      const pattern = `%${escaped}%`
      const versionMatch = /^v?(\d+)$/i.exec(debouncedQuery)
      if (versionMatch) {
        req = req.or(`title.ilike.${pattern},version.eq.${versionMatch[1]}`)
      } else {
        req = req.ilike('title', pattern)
      }
    }
    if (filters.folder) req = req.eq('folder', filters.folder)
    if (filters.lot === 'transversal') req = req.is('lot_id', null)
    else if (filters.lot) req = req.eq('lot_id', filters.lot)
    if (filters.status) req = req.eq('validation_status', filters.status)
    if (filters.country) req = req.eq('country', filters.country)
    if (filters.category) req = req.eq('category', filters.category)

    req.then(({ data, error: err }) => {
      if (!alive) return
      setLoading(false)
      if (err) {
        setError(err.message)
        setResults([])
        return
      }
      setResults(data ?? [])
    })

    return () => { alive = false }
  }, [open, projectId, debouncedQuery, filters])

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const hasAnyInput = query.trim().length > 0 || Object.values(filters).some(Boolean)

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Rechercher un document"
      subtitle="Recherche dans les sous-dossiers Techno, Création, Texte, Divers"
      width="xl"
    >
      <div className="space-y-5 px-6 py-5">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titre ou version (ex : « v2 dépôt SODEC »)"
          className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />

        <div className="grid grid-cols-2 gap-3">
          <FilterSelect label="Sous-dossier" value={filters.folder} onChange={(v) => updateFilter('folder', v)}>
            <option value="">Tous</option>
            {DOCUMENT_FOLDER_OPTIONS.map(f => (
              <option key={f} value={f}>{documentFolder(f).label}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Tableau" value={filters.lot} onChange={(v) => updateFilter('lot', v)}>
            <option value="">Tous</option>
            <option value="transversal">Transversal</option>
            {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Catégorie" value={filters.category} onChange={(v) => updateFilter('category', v)}>
            <option value="">Toutes</option>
            {DOCUMENT_CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>{documentCategory(c)}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Statut" value={filters.status} onChange={(v) => updateFilter('status', v)}>
            <option value="">Tous</option>
            {VALIDATION_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{validationStatus(s).label}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Pays" value={filters.country} onChange={(v) => updateFilter('country', v)}>
            <option value="">Tous</option>
            {COUNTRY_OPTIONS.map(c => (
              <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
            ))}
          </FilterSelect>
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <ResultsList
          loading={loading}
          results={results}
          hasAnyInput={hasAnyInput}
          onPick={(doc) => onPickDocument?.(doc)}
        />
      </div>
    </SlideOver>
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

function ResultsList({ loading, results, hasAnyInput, onPick }) {
  if (!hasAnyInput) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Saisissez un terme ou activez un filtre pour lancer la recherche.
      </p>
    )
  }
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded border border-slate-200 bg-white" />
        <div className="h-12 animate-pulse rounded border border-slate-200 bg-white" />
        <div className="h-12 animate-pulse rounded border border-slate-200 bg-white" />
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Aucun document ne correspond.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {results.map(doc => (
        <ResultRow key={doc.id} doc={doc} onPick={onPick} />
      ))}
    </ul>
  )
}

function ResultRow({ doc, onPick }) {
  const v = validationStatus(doc.validation_status)
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(doc)}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
      >
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium text-slate-900">{doc.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{documentFolder(doc.folder).label}</span>
            <span>·</span>
            <span>{doc.lot?.name ?? 'Transversal'}</span>
            <span>·</span>
            <span>v{doc.version}</span>
          </div>
        </div>
        <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClass(doc.category)}`}>
          {documentCategory(doc.category)}
        </span>
        <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(v.tone)}`}>
          {v.label}
        </span>
        <span title={countryName(doc.country)} className="shrink-0">{countryFlag(doc.country)}</span>
      </button>
    </li>
  )
}
