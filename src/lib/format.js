const COUNTRY_FLAGS = { CA: '🇨🇦', FR: '🇫🇷', LU: '🇱🇺' }
const COUNTRY_NAMES = { CA: 'Canada', FR: 'France', LU: 'Luxembourg' }

export function countryFlag(code) {
  return COUNTRY_FLAGS[code] ?? code
}

export function countryName(code) {
  return COUNTRY_NAMES[code] ?? code
}

const LOT_STATUS = {
  prototype:       { label: 'Prototype',       tone: 'neutral' },
  in_production:   { label: 'En production',   tone: 'warn' },
  post_production: { label: 'Post-production', tone: 'warn' },
  delivered:       { label: 'Livré',           tone: 'ok' },
}

const DELIVERABLE_STATUS = {
  to_produce:  { label: 'À produire', tone: 'neutral' },
  in_progress: { label: 'En cours',   tone: 'warn' },
  submitted:   { label: 'Soumis',     tone: 'warn' },
  validated:   { label: 'Validé',     tone: 'ok' },
}

const FUNDER_STATUS = {
  acquired:   { label: 'Acquis',      tone: 'ok' },
  expected:   { label: 'Pressenti',   tone: 'warn' },
  to_confirm: { label: 'À confirmer', tone: 'neutral' },
}

const VALIDATION_STATUS = {
  draft:    { label: 'Brouillon',  tone: 'neutral' },
  pending:  { label: 'En attente', tone: 'warn' },
  approved: { label: 'Approuvé',   tone: 'ok' },
  archived: { label: 'Archivé',    tone: 'neutral' },
}

const ACCESS_LEVEL = {
  admin:              { label: 'Admin',                  tone: 'ok' },
  coproducer:         { label: 'Producteur·rice',        tone: 'warn' },
  production_manager: { label: 'Chargé·e production',    tone: 'warn' },
  contractor:         { label: 'Prestataire',            tone: 'neutral' },
}

const DOCUMENT_CATEGORY = {
  contract:              'Contrat',
  scenario:              'Scénario',
  artistic_dossier:      'Dossier artistique',
  report:                'Rapport',
  technical_deliverable: 'Livrable technique',
  invoice:               'Facture',
  reference:             'Référence',
}

const CATEGORY_BADGE = {
  contract:              'bg-blue-50 text-blue-700',
  scenario:              'bg-violet-50 text-violet-700',
  artistic_dossier:      'bg-fuchsia-50 text-fuchsia-700',
  report:                'bg-teal-50 text-teal-700',
  technical_deliverable: 'bg-orange-50 text-orange-700',
  invoice:               'bg-slate-100 text-slate-700',
  reference:             'bg-cyan-50 text-cyan-700',
}

const TONE_CLASSES = {
  neutral: 'bg-slate-100 text-slate-700',
  warn:    'bg-amber-50 text-amber-700',
  ok:      'bg-emerald-50 text-emerald-700',
  late:    'bg-red-50 text-red-700',
}

const MILESTONE_TYPE = {
  depot_fonds:      { label: 'Dépôt fonds',      badge: 'bg-blue-50 text-blue-700' },
  festival:         { label: 'Festival',         badge: 'bg-fuchsia-50 text-fuchsia-700' },
  premiere:         { label: 'Première',         badge: 'bg-emerald-50 text-emerald-700' },
  jalon_production: { label: 'Jalon production', badge: 'bg-amber-50 text-amber-700' },
}

const DOCUMENT_FOLDER = {
  techno:   { label: 'Techno',   description: 'Livrables techniques, builds, specs' },
  creation: { label: 'Création', description: 'Dossiers artistiques, scénarios, moodboards' },
  texte:    { label: 'Texte',    description: 'Contrats, rapports, conventions' },
  divers:   { label: 'Divers',   description: 'Factures et autres pièces' },
}

const PRODUCER_FOLDER = {
  assurances:     { label: 'Assurances',     description: 'Polices, attestations, sinistres' },
  legal:          { label: 'Légal',          description: 'Contrats de production, conventions, juridique' },
  devis_initiaux: { label: 'Devis initiaux', description: "Trace figée des devis Excel originaux déposés aux bailleurs. Sert de référence historique pour les rapports et audits, indépendamment de l'évolution du module Budget interactif" },
}

// Mapping URL ↔ DB pour devis_initiaux (URL avec tiret, DB avec underscore).
// Les autres dossiers ont une forme identique. Utilisé par ProducerDocuments,
// Sidebar et le lien depuis Budget.
const PRODUCER_FOLDER_TO_URL = {
  assurances:     'assurances',
  legal:          'legal',
  devis_initiaux: 'devis-initiaux',
}
const PRODUCER_URL_TO_FOLDER = Object.fromEntries(
  Object.entries(PRODUCER_FOLDER_TO_URL).map(([folder, url]) => [url, folder])
)

// Mapping category -> folder par défaut. Sert au pré-remplissage de la modal
// "+ Nouveau document" et reste cohérent avec le commentaire de la migration 008.
const CATEGORY_TO_FOLDER = {
  technical_deliverable: 'techno',
  reference:             'techno',
  artistic_dossier:      'creation',
  scenario:              'creation',
  contract:              'texte',
  report:                'texte',
  invoice:               'divers',
}

const MONTHS_FR = [
  'janvier', 'février', 'mars',     'avril',   'mai',      'juin',
  'juillet', 'août',    'septembre','octobre', 'novembre', 'décembre',
]

export function lotStatus(s) {
  return LOT_STATUS[s] ?? { label: s, tone: 'neutral' }
}

export function deliverableStatus(s) {
  return DELIVERABLE_STATUS[s] ?? { label: s, tone: 'neutral' }
}

export function funderStatus(s) {
  return FUNDER_STATUS[s] ?? { label: s, tone: 'neutral' }
}

export function validationStatus(s) {
  return VALIDATION_STATUS[s] ?? { label: s, tone: 'neutral' }
}

export function accessLevelLabel(s) {
  return ACCESS_LEVEL[s] ?? { label: s, tone: 'neutral' }
}

export function documentCategory(c) {
  return DOCUMENT_CATEGORY[c] ?? c
}

export function categoryBadgeClass(c) {
  return CATEGORY_BADGE[c] ?? 'bg-slate-100 text-slate-700'
}

export function toneClass(tone) {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.neutral
}

export function milestoneType(t) {
  return MILESTONE_TYPE[t] ?? { label: t, badge: 'bg-slate-100 text-slate-700' }
}

export function documentFolder(f) {
  return DOCUMENT_FOLDER[f] ?? { label: f, description: '' }
}

export function producerFolder(f) {
  return PRODUCER_FOLDER[f] ?? { label: f, description: '' }
}

export function producerFolderToUrl(folder) {
  return PRODUCER_FOLDER_TO_URL[folder] ?? folder
}

export function producerUrlToFolder(urlSegment) {
  return PRODUCER_URL_TO_FOLDER[urlSegment] ?? null
}

export function folderForCategory(category) {
  return CATEGORY_TO_FOLDER[category] ?? 'divers'
}

export const LOT_STATUS_OPTIONS = Object.keys(LOT_STATUS)
export const DELIVERABLE_STATUS_OPTIONS = Object.keys(DELIVERABLE_STATUS)
export const FUNDER_STATUS_OPTIONS = Object.keys(FUNDER_STATUS)
export const VALIDATION_STATUS_OPTIONS = Object.keys(VALIDATION_STATUS)
export const DOCUMENT_CATEGORY_OPTIONS = Object.keys(DOCUMENT_CATEGORY)
export const COUNTRY_OPTIONS = Object.keys(COUNTRY_FLAGS)
export const MILESTONE_TYPE_OPTIONS = Object.keys(MILESTONE_TYPE)
export const DOCUMENT_FOLDER_OPTIONS = Object.keys(DOCUMENT_FOLDER)
export const PRODUCER_FOLDER_OPTIONS = Object.keys(PRODUCER_FOLDER)

// PG date columns (no time): force UTC parse to avoid timezone off-by-one
// when client is west of UTC (e.g. America/Toronto would show 2026-06-14
// for a stored date of 2026-06-15 with the naive new Date(iso) approach).
export function formatDateOnly(iso) {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-').map(s => parseInt(s, 10))
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Période entre deux dates ISO. Cas pris en charge :
//  - même date  → "30 mai 2026"
//  - même année → "01 mai – 30 juin 2026" (année une seule fois)
//  - sinon      → "15 déc. 2025 – 15 mars 2026"
export function formatDateRange(startIso, endIso) {
  if (!startIso) return '—'
  if (!endIso || startIso === endIso) return formatDateOnly(startIso)
  const [sy, sm, sd] = startIso.split('-').map(s => parseInt(s, 10))
  const [ey] = endIso.split('-').map(s => parseInt(s, 10))
  if (sy !== ey) {
    return `${formatDateOnly(startIso)} – ${formatDateOnly(endIso)}`
  }
  const startShort = new Date(Date.UTC(sy, sm - 1, sd))
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  return `${startShort} – ${formatDateOnly(endIso)}`
}

export function formatMonth(monthKey) {
  if (!monthKey) return '—'
  const [year, monthStr] = monthKey.split('-')
  const idx = parseInt(monthStr, 10) - 1
  const name = MONTHS_FR[idx] ?? '?'
  return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + year
}

export function formatAmount(amount, currency) {
  if (amount === null || amount === undefined) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffSec = (Date.now() - d.getTime()) / 1000
  if (diffSec < 60)     return "à l'instant"
  if (diffSec < 3600)   return `il y a ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400)  return `il y a ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 172800) return 'hier'
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j.`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function daysUntil(iso) {
  if (!iso) return null
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const today  = new Date();    today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
