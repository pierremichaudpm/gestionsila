import { Fragment } from 'react'
import { countryFlag } from '../../lib/format'
import { convertAmount, formatOne } from '../../lib/currency'
import CommentBadge from '../comments/CommentBadge.jsx'
import CommentThread from '../comments/CommentThread.jsx'

export default function ConsolidatedView({
  orgs,
  lines,
  lots,
  rates,
  projectId,
  commentCounts,
  expandedLineId,
  onToggleExpanded,
  onCommentChange,
}) {
  const orgsById = Object.fromEntries(orgs.map(o => [o.id, o]))
  const lotsById = Object.fromEntries(lots.map(l => [l.id, l]))

  if (!rates?.eurToCad || !rates?.cadToEur) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        <p className="font-medium">Taux de change non définis.</p>
        <p className="mt-1">
          Renseignez les deux taux (1 EUR → CAD et 1 CAD → EUR) dans Paramètres → Taux de change.
        </p>
      </div>
    )
  }

  const toCad = (amount, currency) =>
    currency === 'CAD' ? Number(amount) : convertAmount(amount, currency, 'CAD', rates) ?? 0
  const toEur = (amount, currency) =>
    currency === 'EUR' ? Number(amount) : convertAmount(amount, currency, 'EUR', rates) ?? 0

  const totals = lines.reduce(
    (acc, l) => ({
      plannedCad: acc.plannedCad + toCad(l.planned, l.currency),
      plannedEur: acc.plannedEur + toEur(l.planned, l.currency),
      actualCad:  acc.actualCad  + toCad(l.actual,  l.currency),
      actualEur:  acc.actualEur  + toEur(l.actual,  l.currency),
    }),
    { plannedCad: 0, plannedEur: 0, actualCad: 0, actualEur: 0 }
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Taux appliqués : <strong className="tabular-nums">1 EUR = {rates.eurToCad} CAD</strong> ·{' '}
        <strong className="tabular-nums">1 CAD = {rates.cadToEur} EUR</strong>.
        Montants en devise locale préservés ; conversions côté client.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Org</th>
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2">Tableau</th>
              <th className="px-3 py-2">Devise</th>
              <th className="px-3 py-2 text-right">Prévu (locale)</th>
              <th className="px-3 py-2 text-right">Réel (locale)</th>
              <th className="px-3 py-2 text-right">Prévu CAD</th>
              <th className="px-3 py-2 text-right">Prévu EUR</th>
              <th className="px-3 py-2 text-right">Réel CAD</th>
              <th className="px-3 py-2 text-right">Réel EUR</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map(line => {
              const org = orgsById[line.org_id]
              const lot = lotsById[line.lot_id]
              const expanded = expandedLineId === line.id
              const count = commentCounts.get(line.id) ?? 0
              return (
                <Fragment key={line.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs">
                      {countryFlag(org?.country)} {org?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2">{line.category}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {lot?.name ?? <span className="italic text-slate-400">Transversal</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{line.currency}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatOne(line.planned, line.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatOne(line.actual, line.currency)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatOne(toCad(line.planned, line.currency), 'CAD')}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatOne(toEur(line.planned, line.currency), 'EUR')}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatOne(toCad(line.actual, line.currency), 'CAD')}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatOne(toEur(line.actual, line.currency), 'EUR')}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onToggleExpanded(line.id)}
                        aria-expanded={expanded}
                        className="rounded px-1.5 py-1 hover:bg-slate-100"
                        title={expanded ? 'Masquer les commentaires' : 'Afficher les commentaires'}
                      >
                        <CommentBadge count={count} />
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-slate-50/60">
                      <td colSpan={11} className="px-5 py-4">
                        <CommentThread
                          projectId={projectId}
                          entityType="budget_line"
                          entityId={line.id}
                          onCountChange={onCommentChange}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <tr>
              <td className="px-3 py-3" colSpan={6}>Totaux consolidés</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatOne(totals.plannedCad, 'CAD')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatOne(totals.plannedEur, 'EUR')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatOne(totals.actualCad, 'CAD')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatOne(totals.actualEur, 'EUR')}</td>
              <td className="px-3 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
