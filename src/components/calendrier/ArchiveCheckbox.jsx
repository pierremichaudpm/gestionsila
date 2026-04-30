// Case à cocher d'archivage partagée timeline + colonne label Gantt.
// Cochée = jalon archivé (passe dans la section Archive).
// Décochée = jalon actif. Visuel discret pour ne pas alourdir les listes.

export default function ArchiveCheckbox({ checked, onChange, disabled, title }) {
  return (
    <label
      className={`inline-flex shrink-0 items-center ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      title={title ?? (checked ? 'Désarchiver' : 'Archiver')}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-brand-blue focus:ring-1 focus:ring-brand-blue disabled:cursor-not-allowed"
        aria-label={checked ? 'Désarchiver le jalon' : 'Archiver le jalon'}
      />
    </label>
  )
}
