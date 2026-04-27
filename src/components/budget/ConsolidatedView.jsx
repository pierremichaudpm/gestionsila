import { countryFlag, formatAmount } from '../../lib/format'

export default function ConsolidatedView({ orgs, lines, lots, rate }) {
  const orgsById = Object.fromEntries(orgs.map(o => [o.id, o]))
  const lotsById = Object.fromEntries(lots.map(l => [l.id, l]))

  if (!rate) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        <p className="font-medium">Taux de change non défini.</p>
        <p className="mt-1">
          Définissez le taux EUR → CAD dans l'en-tête de cette page pour activer la vue consolidée.
        </p>
      </div>
    )
  }

  const toCad = (amount, currency) =>
    currency === 'CAD' ? Number(amount) : Number(amount) * rate
  const toEur = (amount, currency) =>
    currency === 'EUR' ? Number(amount) : Number(amount) / rate

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
        Taux appliqué : <strong>1 EUR = {rate} CAD</strong>. Les montants en devise locale sont préservés ;
        les conversions sont calculées côté client.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Org</th>
              <th className="px-3 py-2">Poste</th>
              <th className="px-3 py-2">Lot</th>
              <th className="px-3 py-2">Devise</th>
              <th className="px-3 py-2 text-right">Prévu (locale)</th>
              <th className="px-3 py-2 text-right">Réel (locale)</th>
              <th className="px-3 py-2 text-right">Prévu CAD</th>
              <th className="px-3 py-2 text-right">Prévu EUR</th>
              <th className="px-3 py-2 text-right">Réel CAD</th>
              <th className="px-3 py-2 text-right">Réel EUR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map(line => {
              const org = orgsById[line.org_id]
              const lot = lotsById[line.lot_id]
              return (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs">
                    {countryFlag(org?.country)} {org?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2">{line.category}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {lot?.name ?? <span className="italic text-slate-400">Transversal</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{line.currency}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(line.planned).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(line.actual).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{toCad(line.planned, line.currency).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{toEur(line.planned, line.currency).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{toCad(line.actual, line.currency).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{toEur(line.actual, line.currency).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-700">
            <tr>
              <td className="px-3 py-3" colSpan={6}>Totaux consolidés</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatAmount(totals.plannedCad, 'CAD')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatAmount(totals.plannedEur, 'EUR')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatAmount(totals.actualCad, 'CAD')}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatAmount(totals.actualEur, 'EUR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
