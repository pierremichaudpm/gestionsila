import { useEffect, useState } from 'react'
import { convertAmount } from '../../lib/currency'
import ModifiedBadge from '../audit/ModifiedBadge.jsx'
import { BUDGET_LINE_LABELS } from '../../lib/auditLabels'

const COST_ORIGIN_OPTIONS = [
  { value: '',          label: '—' },
  { value: 'interne',   label: 'Interne' },
  { value: 'apparente', label: 'Apparenté' },
  { value: 'externe',   label: 'Externe' },
]

const COST_ORIGIN_LABEL = {
  interne:   'Interne',
  apparente: 'Apparenté',
  externe:   'Externe',
}

export default function BudgetLineRow({ line, lots, orgs, isAdmin, editable, onUpdate, onDelete, extraCells, rates }) {
  const [draft, setDraft] = useState(initialDraft(line))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft(initialDraft(line))
  }, [line.id, line.code, line.category, line.planned, line.actual, line.lot_id, line.cost_origin])

  async function commit(patch) {
    setSaving(true)
    setError(null)
    const { error: e } = await onUpdate(line.id, patch)
    setSaving(false)
    if (e) setError(e.message)
  }

  function onCodeBlur() {
    const v = draft.code.trim() || null
    if (v !== (line.code ?? null)) commit({ code: v })
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

  function onOriginChange(e) {
    const v = e.target.value || null
    setDraft(d => ({ ...d, cost_origin: e.target.value }))
    if (v !== (line.cost_origin ?? null)) commit({ cost_origin: v })
  }

  function onCurrencyChange(e) {
    const v = e.target.value
    setDraft(d => ({ ...d, currency: v }))
    if (v !== line.currency) commit({ currency: v })
  }

  function onOrgChange(e) {
    const v = e.target.value
    setDraft(d => ({ ...d, org_id: v }))
    if (v !== line.org_id) commit({ org_id: v })
  }

  async function handleDelete() {
    const ref = line.code ? `${line.code} — ${line.category}` : line.category
    if (!window.confirm(`Supprimer la ligne « ${ref} » ? Cette action est irréversible.`)) return
    await onDelete(line.id)
  }

  return (
    <tr className={saving ? 'opacity-60' : ''}>
      <td className="px-3 py-2">
        {editable ? (
          <input
            type="text"
            value={draft.code}
            onChange={(e) => setDraft(d => ({ ...d, code: e.target.value }))}
            onBlur={onCodeBlur}
            className="w-12 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs tabular-nums hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="—"
          />
        ) : (
          <span className="text-xs tabular-nums text-slate-600">{line.code ?? '—'}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
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
          <ModifiedBadge
            importedValue={line.imported_value}
            modifiedAt={line.last_modified_at}
            modifiedByName={line.last_modified_by_user?.full_name}
            fieldLabels={BUDGET_LINE_LABELS}
          />
        </div>
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
        <AmountCell
          editable={editable}
          value={draft.planned}
          onChange={(v) => setDraft(d => ({ ...d, planned: v }))}
          onBlur={() => onAmountBlur('planned')}
          nativeValue={line.planned}
          nativeCurrency={line.currency}
          rates={rates}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <AmountCell
          editable={editable}
          value={draft.actual}
          onChange={(v) => setDraft(d => ({ ...d, actual: v }))}
          onBlur={() => onAmountBlur('actual')}
          nativeValue={line.actual}
          nativeCurrency={line.currency}
          rates={rates}
        />
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">
        {editable ? (
          <select
            value={draft.currency}
            onChange={onCurrencyChange}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="CAD">CAD</option>
            <option value="EUR">EUR</option>
          </select>
        ) : (
          line.currency
        )}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <select
            value={draft.cost_origin}
            onChange={onOriginChange}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {COST_ORIGIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <span className="text-xs text-slate-600">
            {line.cost_origin ? COST_ORIGIN_LABEL[line.cost_origin] : <span className="italic text-slate-400">—</span>}
          </span>
        )}
      </td>
      {extraCells}
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {editable && isAdmin && orgs ? (
            <select
              value={draft.org_id}
              onChange={onOrgChange}
              title="Réaffecter à une autre organisation (admin)"
              className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          ) : null}
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
          {error ? <span className="text-xs text-red-600" title={error}>!</span> : null}
        </div>
      </td>
    </tr>
  )
}

function initialDraft(line) {
  return {
    code:        line.code ?? '',
    category:    line.category,
    planned:     line.planned,
    actual:      line.actual,
    lot_id:      line.lot_id ?? '',
    cost_origin: line.cost_origin ?? '',
    currency:    line.currency,
    org_id:      line.org_id,
  }
}

// Cellule montant avec affichage dual : montant principal en devise native
// (gras), montant converti dans l'autre devise (gris, plus petit) en dessous.
// En mode édition, l'input est sur la devise native ; le converti se met à
// jour à chaque saisie.
function AmountCell({ editable, value, onChange, onBlur, nativeValue, nativeCurrency, rates }) {
  const targetCurrency = nativeCurrency === 'CAD' ? 'EUR' : 'CAD'
  // En mode édition : utilise la valeur courante de l'input (live preview).
  // En mode lecture : utilise la valeur persistée du record.
  const sourceForDerived = editable ? Number(value || 0) : Number(nativeValue || 0)
  const derivedRaw = convertAmount(sourceForDerived, nativeCurrency, targetCurrency, rates)
  const derived = derivedRaw !== null
    ? `${Number(derivedRaw).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${targetCurrency}`
    : null

  if (editable) {
    return (
      <div className="flex flex-col items-end">
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-base font-semibold tabular-nums text-slate-900 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        {derived ? (
          <span className="text-xs tabular-nums text-slate-500">{derived}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <span className="text-base font-semibold tabular-nums text-slate-900">
        {Number(nativeValue).toLocaleString('fr-FR')} {nativeCurrency}
      </span>
      {derived ? (
        <span className="text-xs tabular-nums text-slate-500">{derived}</span>
      ) : null}
    </div>
  )
}
