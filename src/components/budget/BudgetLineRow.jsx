import { useEffect, useState } from 'react'

export default function BudgetLineRow({ line, lots, editable, onUpdate, onDelete, extraCells }) {
  const [draft, setDraft] = useState({
    category: line.category,
    planned: line.planned,
    actual: line.actual,
    lot_id: line.lot_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft({
      category: line.category,
      planned: line.planned,
      actual: line.actual,
      lot_id: line.lot_id ?? '',
    })
  }, [line.id, line.category, line.planned, line.actual, line.lot_id])

  async function commit(patch) {
    setSaving(true)
    setError(null)
    const { error: e } = await onUpdate(line.id, patch)
    setSaving(false)
    if (e) setError(e.message)
  }

  function onCategoryBlur() {
    const v = draft.category.trim()
    if (v && v !== line.category) commit({ category: v })
  }

  function onAmountBlur(field) {
    const raw = draft[field]
    const v = parseFloat(raw)
    if (Number.isNaN(v)) {
      setDraft(d => ({ ...d, [field]: line[field] }))
      return
    }
    if (v !== line[field]) commit({ [field]: v })
  }

  function onLotChange(e) {
    const v = e.target.value || null
    setDraft(d => ({ ...d, lot_id: e.target.value }))
    if (v !== line.lot_id) commit({ lot_id: v })
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer la ligne « ${line.category} » ? Cette action est irréversible.`)) return
    await onDelete(line.id)
  }

  return (
    <tr className={saving ? 'opacity-60' : ''}>
      <td className="px-3 py-2">
        {editable ? (
          <input
            type="text"
            value={draft.category}
            onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
            onBlur={onCategoryBlur}
            list="budget-categories"
            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          <span className="text-sm">{line.category}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <select
            value={draft.lot_id}
            onChange={onLotChange}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Transversal</option>
            {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        ) : (
          <span className="text-xs text-slate-600">
            {lots.find(l => l.id === line.lot_id)?.name ?? <span className="italic text-slate-400">Transversal</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.planned}
            onChange={(e) => setDraft(d => ({ ...d, planned: e.target.value }))}
            onBlur={() => onAmountBlur('planned')}
            className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          <span className="text-sm tabular-nums">{Number(line.planned).toLocaleString('fr-FR')}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.actual}
            onChange={(e) => setDraft(d => ({ ...d, actual: e.target.value }))}
            onBlur={() => onAmountBlur('actual')}
            className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          <span className="text-sm tabular-nums">{Number(line.actual).toLocaleString('fr-FR')}</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">{line.currency}</td>
      {extraCells}
      <td className="px-3 py-2 text-right">
        {editable ? (
          <button
            type="button"
            onClick={handleDelete}
            title="Supprimer la ligne"
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9.5h5L11 4M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        ) : null}
        {error ? <span className="ml-2 text-xs text-red-600" title={error}>!</span> : null}
      </td>
    </tr>
  )
}
