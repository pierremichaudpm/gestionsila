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
  coproducer:         { label: 'Coproducteur',           tone: 'warn' },
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
}

const CATEGORY_BADGE = {
  contract:              'bg-blue-50 text-blue-700',
  scenario:              'bg-violet-50 text-violet-700',
  artistic_dossier:      'bg-fuchsia-50 text-fuchsia-700',
  report:                'bg-teal-50 text-teal-700',
  technical_deliverable: 'bg-orange-50 text-orange-700',
  invoice:               'bg-slate-100 text-slate-700',
}

const TONE_CLASSES = {
  neutral: 'bg-slate-100 text-slate-700',
  warn:    'bg-amber-50 text-amber-700',
  ok:      'bg-emerald-50 text-emerald-700',
  late:    'bg-red-50 text-red-700',
}

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

export const LOT_STATUS_OPTIONS = Object.keys(LOT_STATUS)
export const DELIVERABLE_STATUS_OPTIONS = Object.keys(DELIVERABLE_STATUS)
export const VALIDATION_STATUS_OPTIONS = Object.keys(VALIDATION_STATUS)
export const DOCUMENT_CATEGORY_OPTIONS = Object.keys(DOCUMENT_CATEGORY)
export const COUNTRY_OPTIONS = Object.keys(COUNTRY_FLAGS)

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
