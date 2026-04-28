import { countryFlag, formatAmount } from '../../lib/format'
import BudgetLineRow from './BudgetLineRow.jsx'
import CommentBadge from '../comments/CommentBadge.jsx'
import CommentThread from '../comments/CommentThread.jsx'

export default function ByCoproducerView({
  orgs,
  lines,
  lots,
  canEditOrg,
  onCreate,
  onUpdate,
  onDelete,
  projectId,
  commentCounts,
  expandedLineId,
  onToggleExpanded,
  onCommentChange,
}) {
  const orgsWithLines = orgs.filter(org =>
    org.role === 'producer' || org.role === 'coproducer' || lines.some(l => l.org_id === org.id)
  )

  return (
    <div className="space-y-6">
      <datalist id="budget-categories">
        <option value="Développement" />
        <option value="Scénario" />
        <option value="Préparation" />
        <option value="Tournage" />
        <option value="Post-production" />
        <option value="Intégration VR" />
        <option value="Régie" />
        <option value="Frais généraux" />
        <option value="Frais structure" />
      </datalist>

      {orgsWithLines.map(org => {
        const orgLines = lines.filter(l => l.org_id === org.id)
        const editable = canEditOrg(org.id)
        const totalPlanned = orgLines.reduce((s, l) => s + Number(l.planned), 0)
        const totalActual = orgLines.reduce((s, l) => s + Number(l.actual), 0)

        return (
          <section key={org.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
              <span className="text-base">{countryFlag(org.country)}</span>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-900">{org.name}</h2>
                <p className="text-xs text-slate-500">
                  {orgLines.length} {orgLines.length > 1 ? 'lignes' : 'ligne'} · {org.currency}
                  {!editable ? <span className="ml-2 italic">— lecture seule</span> : null}
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-500">Prévu : <strong className="tabular-nums text-slate-900">{formatAmount(totalPlanned, org.currency)}</strong></div>
                <div className="text-slate-500">Réel : <strong className="tabular-nums text-slate-900">{formatAmount(totalActual, org.currency)}</strong></div>
              </div>
            </header>

            {orgLines.length === 0 && !editable ? (
              <p className="px-5 py-4 text-sm text-slate-500">Aucune ligne budgétaire.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Poste</th>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2 text-right">Prévu</th>
                      <th className="px-3 py-2 text-right">Réel</th>
                      <th className="px-3 py-2">Devise</th>
                      <th className="px-3 py-2"></th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgLines.map(line => {
                      const expanded = expandedLineId === line.id
                      const count = commentCounts.get(line.id) ?? 0
                      return (
                        <Row
                          key={line.id}
                          line={line}
                          lots={lots}
                          editable={editable}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                          projectId={projectId}
                          expanded={expanded}
                          count={count}
                          onToggleExpanded={() => onToggleExpanded(line.id)}
                          onCommentChange={onCommentChange}
                        />
                      )
                    })}
                    {orgLines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                          Aucune ligne budgétaire pour cette org.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-600">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>Total {org.currency}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(totalPlanned).toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(totalActual).toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2">{org.currency}</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {editable ? (
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onCreate(org.id, org.currency)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
                >
                  + Ligne
                </button>
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function Row({ line, lots, editable, onUpdate, onDelete, projectId, expanded, count, onToggleExpanded, onCommentChange }) {
  const badgeCell = (
    <td className="px-3 py-2">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="rounded px-1.5 py-1 hover:bg-slate-100"
        title={expanded ? 'Masquer les commentaires' : 'Afficher les commentaires'}
      >
        <CommentBadge count={count} />
      </button>
    </td>
  )
  return (
    <>
      <BudgetLineRow
        line={line}
        lots={lots}
        editable={editable}
        onUpdate={onUpdate}
        onDelete={onDelete}
        extraCells={badgeCell}
      />
      {expanded ? (
        <tr className="bg-slate-50/60">
          <td colSpan={7} className="px-5 py-4">
            <CommentThread
              projectId={projectId}
              entityType="budget_line"
              entityId={line.id}
              onCountChange={onCommentChange}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
