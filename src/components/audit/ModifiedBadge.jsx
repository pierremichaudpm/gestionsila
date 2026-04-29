import { relativeTime } from '../../lib/format'

// Petit picto qui s'affiche sur les lignes éditées après import.
// Tooltip au survol : date de dernière modification, utilisateur, et
// valeurs d'origine pour les champs modifiés.
//
// Props :
//   importedValue   : jsonb (peut être null/empty) — valeurs d'origine
//                     capturées par le trigger track_imported_changes.
//   modifiedAt      : timestamp ISO du dernier changement
//   modifiedByName  : nom de l'auteur (résolu via FK)
//   fieldLabels     : { col: 'Libellé humain' } pour formatter le tooltip
//   skipIdFields    : true par défaut — ne pas afficher la valeur brute
//                     des champs *_id (UUIDs peu lisibles)
export default function ModifiedBadge({ importedValue, modifiedAt, modifiedByName, fieldLabels, skipIdFields = true }) {
  if (!importedValue || typeof importedValue !== 'object') return null
  const entries = Object.entries(importedValue)
  if (entries.length === 0) return null

  const tooltip = buildTooltip({ entries, modifiedAt, modifiedByName, fieldLabels, skipIdFields })

  return (
    <span
      title={tooltip}
      className="ml-1 inline-flex shrink-0 cursor-help items-center text-amber-600"
      aria-label="Cette ligne a été modifiée depuis son import"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function buildTooltip({ entries, modifiedAt, modifiedByName, fieldLabels, skipIdFields }) {
  const header = []
  header.push("Cette ligne a été modifiée depuis son import initial.")
  header.push('')
  if (modifiedAt || modifiedByName) {
    header.push(`Dernière modif${modifiedAt ? ' ' + relativeTime(modifiedAt) : ''}${modifiedByName ? ' par ' + modifiedByName : ''}.`)
    header.push('')
  }
  header.push("Valeurs d'origine (avant les modifications) :")

  const lines = entries.map(([key, value]) => {
    const label = fieldLabels?.[key] ?? key
    if (skipIdFields && key.endsWith('_id')) {
      return `  • ${label} : (modifié)`
    }
    return `  • ${label} : ${formatValue(value)}`
  })

  return [...header, ...lines].join('\n')
}

function formatValue(value) {
  if (value === null || value === undefined) return '(vide)'
  if (typeof value === 'boolean') return value ? 'oui' : 'non'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
