import { useEffect } from 'react'

// Panneau coulissant qui glisse depuis la droite. Wrapper réutilisable
// (Bailleur, Recherche Documents…). Backdrop qui ferme au clic, ESC qui
// ferme aussi. Largeur paramétrable.
//
// Différence avec Modal : pas centré, pleine hauteur, plus large par défaut
// (assez de place pour un formulaire d'édition + une liste).

const WIDTH_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
}

export default function SlideOver({ open, onClose, title, subtitle, width = 'lg', children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Verrouille le scroll du body pendant l'ouverture du panneau.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex h-full w-full ${WIDTH_CLASSES[width] ?? WIDTH_CLASSES.lg} flex-col bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="truncate text-lg font-semibold text-brand-navy">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
