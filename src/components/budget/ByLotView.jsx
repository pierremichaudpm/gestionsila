import { countryFlag, formatAmount } from '../../lib/format'

export default function ByLotView({ orgs, lines, lots }) {
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
        <p className="mt-1">Ajoutez des lignes via la vue « Par coproducteur ».</p>
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
                  {lot ? lot.name : <span className="italic">Transversal (aucun lot)</span>}
                </h2>
                {lot ? (
                  <p className="text-xs text-slate-500">{countryFlag(lot.country)} · {lot.director ?? '—'}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3 text-right text-xs">
                {Object.entries(byCurrency).map(([currency, sums]) => (
                  <div key={currency}>
                    <div className="text-slate-500">Prévu {currency} : <strong className="tabular-nums text-slate-900">{formatAmount(sums.planned, currency)}</strong></div>
                    <div className="text-slate-500">Réel {currency} : <strong className="tabular-nums text-slate-900">{formatAmount(sums.actual, currency)}</strong></div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupLines.map(line => {
                    const org = orgsById[line.org_id]
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2 text-xs">{countryFlag(org?.country)} {org?.name ?? '—'}</td>
                        <td className="px-3 py-2">{line.category}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(line.planned).toLocaleString('fr-FR')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(line.actual).toLocaleString('fr-FR')}</td>
                        <td className="px-3 py-2 text-xs">{line.currency}</td>
                      </tr>
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
