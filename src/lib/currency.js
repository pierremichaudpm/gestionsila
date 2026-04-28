// Helpers pour le double affichage CAD/EUR.
//
// Les deux taux sont INDÉPENDANTS — pas calculés l'un de l'autre. On utilise
// rates.eurToCad pour convertir EUR → CAD, et rates.cadToEur pour CAD → EUR.
// Aucune réciprocité forcée ; on respecte les valeurs contractuelles.

const CURRENCY_LABEL = { CAD: 'CAD', EUR: 'EUR' }

export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (amount === null || amount === undefined) return null
  if (fromCurrency === toCurrency) return Number(amount)
  if (fromCurrency === 'EUR' && toCurrency === 'CAD') {
    return rates?.eurToCad ? Number(amount) * Number(rates.eurToCad) : null
  }
  if (fromCurrency === 'CAD' && toCurrency === 'EUR') {
    return rates?.cadToEur ? Number(amount) * Number(rates.cadToEur) : null
  }
  return null
}

// Formatte un nombre dans une devise. fractionDigits null → entier ; sinon
// max N décimales.
export function formatOne(amount, currency, options = {}) {
  if (amount === null || amount === undefined) return null
  const fractionDigits = options.fractionDigits ?? 0
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(amount))
  return `${formatted} ${CURRENCY_LABEL[currency] ?? currency}`
}

// Renvoie un objet { native, derived, derivedRaw } pour usage en JSX (afficher
// la devise native + la dérivée séparément, p.ex. en pile).
export function formatDual(amount, nativeCurrency, rates, options = {}) {
  const targetCurrency = nativeCurrency === 'CAD' ? 'EUR' : 'CAD'
  const native = formatOne(amount, nativeCurrency, options)
  const derivedRaw = convertAmount(amount, nativeCurrency, targetCurrency, rates)
  const derived = derivedRaw !== null ? formatOne(derivedRaw, targetCurrency, options) : null
  return { native, derived, derivedRaw, derivedCurrency: targetCurrency }
}

// Version chaîne compacte : "120 327 CAD / 74 587 EUR" (ou juste la native si
// le taux manque).
export function formatDualString(amount, nativeCurrency, rates, options = {}) {
  const { native, derived } = formatDual(amount, nativeCurrency, rates, options)
  if (!native) return '—'
  if (!derived) return native
  return `${native} / ${derived}`
}

// Pour les funding_sources qui ont les deux montants stockés contractuellement :
// jamais convertir, juste afficher tel quel. Si l'un est NULL, on convertit
// l'autre au taux courant pour combler.
export function formatBothStored(amountEur, amountCad, rates, options = {}) {
  const hasEur = amountEur !== null && amountEur !== undefined
  const hasCad = amountCad !== null && amountCad !== undefined

  if (hasEur && hasCad) {
    return `${formatOne(amountCad, 'CAD', options)} / ${formatOne(amountEur, 'EUR', options)}`
  }
  if (hasCad) return formatDualString(amountCad, 'CAD', rates, options)
  if (hasEur) return formatDualString(amountEur, 'EUR', rates, options)
  return '—'
}
