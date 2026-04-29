import { Fragment } from 'react'
import { countryFlag } from '../../lib/format'
import { convertAmount, formatDualString } from '../../lib/currency'
import CommentBadge from '../comments/CommentBadge.jsx'
import CommentThread from '../comments/CommentThread.jsx'

export default function ByLotView({
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

  const groups = []
  for (const lot of lots) {
    const lotLines = lines.filter(l => l.lot_id === lot.id)
    if (lotLines.length > 0) groups.push({ lot, lines: lotLines })
  }
  const transversalLines = lines.filter(l => !l.lot_id)
  if (transversalLines.length > 0) groups.push({ lot: null, lines: transversalLines })

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-medium text-slate-900">Aucune ligne budgétaire.</p>
        <p className="mt-1">Ajoutez des lignes via la vue « Par producteur·rice ».</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(({ lot, lines: groupLines }) => {
        const byCurrency = groupLines.reduce((acc, l) => {
          const c = l.currency
          if (!acc[c]) acc[c] = { planned: 0, actual: 0 }
          acc[c].planned += Number(l.planned)
          acc[c].actual += Number(l.actual)
          return acc
        }, {})

        return (
          <section key={lot?.id ?? 'transversal'} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  {lot ? lot.name : <span className="italic">Transversal (aucun tableau)</span>}
                </h2>
                {lot ? (
                  <p className="text-xs text-slate-500">{countryFlag(lot.country)} · {lot.director ?? '—'}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-right text-xs">
                {Object.entries(byCurrency).map(([currency, sums]) => (
                  <div key={currency}>
                    <div className="text-slate-500">
                      Prévu : <strong className="tabular-nums text-slate-900">{formatDualString(sums.planned, currency, rates)}</strong>
                    </div>
                    <div className="text-slate-500">
                      Réel : <strong className="tabular-nums text-slate-900">{formatDualString(sums.actual, currency, rates)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Org</th>
                    <th className="px-3 py-2">Poste</th>
                    <th className="px-3 py-2 text-right">Prévu</th>
                    <th className="px-3 py-2 text-right">Réel</th>
                    <th className="px-3 py-2">Devise</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupLines.map(line => {
                    const org = orgsById[line.org_id]
                    const expanded = expandedLineId === line.id
                    const count = commentCounts.get(line.id) ?? 0
                    return (
                      <Fragment key={line.id}>
                        <tr>
                          <td className="px-3 py-2 text-xs">{countryFlag(org?.country)} {org?.name ?? '—'}</td>
                          <td className="px-3 py-2">{line.category}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <DualCell amount={line.planned} currency={line.currency} rates={rates} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <DualCell amount={line.actual} currency={line.currency} rates={rates} />
                          </td>
                          <td className="px-3 py-2 text-xs">{line.currency}</td>
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
                            <td colSpan={6} className="px-5 py-4">
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
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DualCell({ amount, currency, rates }) {
  const targetCurrency = currency === 'CAD' ? 'EUR' : 'CAD'
  const derived = convertAmount(amount, currency, targetCurrency, rates)
  return (
    <div className="flex flex-col items-end">
      <span className="text-base font-semibold tabular-nums text-slate-900">{Number(amount).toLocaleString('fr-FR')} {currency}</span>
      {derived !== null ? (
        <span className="text-xs tabular-nums text-slate-500">{Number(derived).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {targetCurrency}</span>
      ) : null}
    </div>
  )
}
