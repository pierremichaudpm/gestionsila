// Palette éditoriale chaude pour la vue Gantt du calendrier.
// Inspirée du fichier de référence "cibles_rouges_gantt_2.html" : tons encre/
// papier, pas de navy. Une couleur par bailleur SILA, plus le taupe pour la
// swimlane "Production interne" (jalons sans bailleur).
//
// Mapping par UUID des bailleurs seedés (cf. supabase/seed.sql) :
//   55555555-...-001  SODEC — Volet 2
//   55555555-...-002  CNC — Création Immersive
//   55555555-...-003  FilmFund Luxembourg — Dév.   ┐  même couleur :
//   55555555-...-004  FilmFund Luxembourg — Prod.  ┘  même bailleur (LU)
//   55555555-...-005  Pictanovo
//   55555555-...-006  Région SUD PACA
//   55555555-...-007  Métropole Montpellier
//
// Les nouveaux bailleurs (hors seed) reçoivent une couleur déterministe via
// FALLBACK_PALETTE indexée par hash de l'UUID.

const KNOWN = {
  '55555555-0000-0000-0000-000000000001': '#a8243a', // SODEC — rouge brick
  '55555555-0000-0000-0000-000000000002': '#386053', // CNC — vert sapin
  '55555555-0000-0000-0000-000000000003': '#2a4468', // FilmFund LU Dév — bleu encre
  '55555555-0000-0000-0000-000000000004': '#2a4468', // FilmFund LU Prod — bleu encre
  '55555555-0000-0000-0000-000000000005': '#ac7a1f', // Pictanovo — ocre
  '55555555-0000-0000-0000-000000000006': '#8b3a62', // Région SUD PACA — prune
  '55555555-0000-0000-0000-000000000007': '#5a6b2f', // Métropole Montpellier — olive
}

const FALLBACK_PALETTE = [
  '#a8243a', '#386053', '#2a4468', '#ac7a1f',
  '#8b3a62', '#5a6b2f',
]

export const INTERNAL_COLOR = '#5a5248' // taupe encre — fallback (pas de pays)
export const INTERNAL_LABEL = 'Production interne'

// Couleurs des swimlanes "Production interne — pays".
// Demande Virginie 2026-04-30 : un jalon interne hérite de la couleur de son
// pays plutôt que d'un taupe générique.
//   CA → bordeaux foncé (distinct du SODEC #a8243a, palette éditoriale chaude)
//   FR → bleu marine France (sobre, distinct du FFL #2a4468)
//   LU → bleu Luxembourg plus clair (distinct du FFL — Luxembourg lui aussi
//        est "bleu" mais foncé)
const INTERNAL_BY_COUNTRY = {
  CA: '#7a1726',
  FR: '#002654',
  LU: '#00a4d6',
}

export function getInternalColor(country) {
  return INTERNAL_BY_COUNTRY[country] ?? INTERNAL_COLOR
}

export function internalLabel(country) {
  return country
    ? `${INTERNAL_LABEL} — ${country}`
    : INTERNAL_LABEL
}

export function getFunderColor(funderId) {
  if (!funderId) return INTERNAL_COLOR
  if (KNOWN[funderId]) return KNOWN[funderId]
  let h = 0
  for (let i = 0; i < funderId.length; i++) {
    h = (h * 31 + funderId.charCodeAt(i)) | 0
  }
  return FALLBACK_PALETTE[Math.abs(h) % FALLBACK_PALETTE.length]
}
