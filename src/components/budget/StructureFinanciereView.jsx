import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { countryFlag, countryName } from '../../lib/format'
import { convertAmount, formatOne } from '../../lib/currency'
import ModifiedBadge from '../audit/ModifiedBadge.jsx'
import { FUNDING_SOURCE_LABELS } from '../../lib/auditLabels'

const COUNTRIES = ['CA', 'FR', 'LU']
const COHERENCE_TOLERANCE = 1

const STATUS_LABEL = {
  acquired: { label: 'Acquis',    tone: 'bg-emerald-50 text-emerald-700' },
  expected: { label: 'Pressenti', tone: 'bg-amber-50 text-amber-800' },
}

export default function StructureFinanciereView({
  projectId,
  orgs,
  lines,
  rates,
  accessLevel,
  userCountry,
  fundingSources,
  onSourcesChange,
}) {
  const [openCountries, setOpenCountries] = useState(new Set(COUNTRIES))
  const [actionError, setActionError] = useState(null)

  function toggleCountry(c) {
    setOpenCountries(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  function canEditCountry(country) {
    if (accessLevel === 'admin') return true
    if (accessLevel === 'coproducer' && country === userCountry) return true
    return false
  }

  // Mappings pays → org pour le contrôle de cohérence avec budget_lines.
  // On prend le 1er producer/coproducer du pays (JAXA / Dark Euphoria / Poulpe Bleu).
  const orgByCountry = useMemo(() => {
    const map = {}
    for (const org of orgs) {
      if (!['producer', 'coproducer'].includes(org.role)) continue
      if (!map[org.country]) map[org.country] = org
    }
    return map
  }, [orgs])

  // Total CAD du budget_lines pour une org donnée. Convertit les EUR en CAD
  // au taux courant si l'org est en EUR.
  function budgetTotalCadFor(org) {
    if (!org) return 0
    const orgLines = lines.filter(l => l.org_id === org.id)
    return orgLines.reduce((sum, l) => {
      const planned = Number(l.planned)
      if (l.currency === 'CAD') return sum + planned
      const converted = convertAmount(planned, l.currency, 'CAD', rates)
      return sum + (converted ?? 0)
    }, 0)
  }

  // Pour les sources : amount_cad si présent (contractuel), sinon conversion
  // via le taux courant pour combler. Idem dans l'autre sens pour amount_eur.
  function sourceCadValue(source) {
    if (source.amount_cad !== null && source.amount_cad !== undefined) return Number(source.amount_cad)
    return convertAmount(source.amount_eur, 'EUR', 'CAD', rates) ?? 0
  }

  function sourceEurValue(source) {
    if (source.amount_eur !== null && source.amount_eur !== undefined) return Number(source.amount_eur)
    return convertAmount(source.amount_cad, 'CAD', 'EUR', rates) ?? 0
  }

  async function handleCreate(country) {
    setActionError(null)
    const maxOrder = fundingSources
      .filter(s => s.country === country)
      .reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0)
    const { data, error } = await supabase
      .from('funding_sources')
      .insert({
        project_id: projectId,
        country,
        source_name: 'Nouvelle source',
        amount_eur: null,
        amount_cad: null,
        status: 'expected',
        notes: null,
        sort_order: maxOrder + 1,
      })
      .select('id, country, source_name, amount_eur, amount_cad, status, notes, sort_order, imported_value, last_modified_at, last_modified_by_user:users!funding_sources_last_modified_by_fkey(full_name)')
      .single()
    if (error) {
      setActionError(error.message)
      return
    }
    onSourcesChange([...fundingSources, data])
  }

  async function handleUpdate(id, patch) {
    setActionError(null)
    const previous = fundingSources
    onSourcesChange(previous.map(s => (s.id === id ? { ...s, ...patch } : s)))
    const { error } = await supabase.from('funding_sources').update(patch).eq('id', id)
    if (error) {
      onSourcesChange(previous)
      setActionError(error.message)
    }
    return { error }
  }

  async function handleDelete(id) {
    setActionError(null)
    const target = fundingSources.find(s => s.id === id)
    if (!target) return
    if (!window.confirm(`Supprimer la source « ${target.source_name} » ? Cette action est irréversible.`)) return
    const previous = fundingSources
    onSourcesChange(previous.filter(s => s.id !== id))
    const { error } = await supabase.from('funding_sources').delete().eq('id', id)
    if (error) {
      onSourcesChange(previous)
      setActionError(error.message)
    }
  }

  const grandTotals = useMemo(() => {
    const sourcesCad = fundingSources.reduce((s, src) => s + sourceCadValue(src), 0)
    const sourcesEur = fundingSources.reduce((s, src) => s + sourceEurValue(src), 0)
    const budgetCad  = COUNTRIES.reduce((s, c) => s + budgetTotalCadFor(orgByCountry[c]), 0)
    return { sourcesCad, sourcesEur, budgetCad }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundingSources, lines, orgs, rate])

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Sources de financement par pays. Les montants <strong>EUR et CAD</strong> sont stockés
        séparément (montants contractuels). Le taux courant
        {rates?.eurToCad && rates?.cadToEur ? (
          <> (<span className="tabular-nums">1 EUR = {rates.eurToCad} CAD</span> · <span className="tabular-nums">1 CAD = {rates.cadToEur} EUR</span>)</>
        ) : ' (non défini)'}
        {' '}sert uniquement aux conversions affichées si une devise manque.
      </p>

      {fundingSources.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Aucune source de financement chargée.</p>
          <p className="mt-1 text-xs">
            22 sources ont été importées au démarrage. Si cet écran reste vide, faites un
            rechargement forcé (Ctrl+F5 sur Windows, Cmd+Shift+R sur Mac) pour vider le cache
            du navigateur. Si le problème persiste, contactez le support technique.
          </p>
        </div>
      ) : null}

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {COUNTRIES.map(country => {
        const open = openCountries.has(country)
        const editable = canEditCountry(country)
        const sources = fundingSources.filter(s => s.country === country)
        const sourcesCad = sources.reduce((s, src) => s + sourceCadValue(src), 0)
        const sourcesEur = sources.reduce((s, src) => s + sourceEurValue(src), 0)
        const org = orgByCountry[country]
        const budgetCad = budgetTotalCadFor(org)
        const diff = sourcesCad - budgetCad

        return (
          <section key={country} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => toggleCountry(country)}
                aria-expanded={open}
                className="flex items-center gap-2 text-left"
              >
                <span className="text-slate-400">{open ? '▾' : '▸'}</span>
                <span className="text-base">{countryFlag(country)}</span>
                <span className="text-sm font-semibold text-slate-900">{countryName(country)}</span>
                <span className="text-xs text-slate-500">
                  · {sources.length} {sources.length > 1 ? 'sources' : 'source'}
                </span>
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
                <div className="text-right">
                  <div className="font-medium tabular-nums text-slate-900">
                    {formatOne(sourcesCad, 'CAD', { fractionDigits: 2 })} / {formatOne(sourcesEur, 'EUR', { fractionDigits: 2 })}
                  </div>
                </div>
                <CoherenceBadge diff={diff} budgetCad={budgetCad} hasOrg={!!org} />
              </div>
            </header>

            {open ? (
              <div className="border-t border-slate-200">
                {sources.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-500">Aucune source enregistrée pour ce pays.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2 text-right">EUR</th>
                          <th className="px-3 py-2 text-right">CAD</th>
                          <th className="px-3 py-2">Statut</th>
                          <th className="px-3 py-2">Notes</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sources.map(source => (
                          <SourceRow
                            key={source.id}
                            source={source}
                            editable={editable}
                            isAdmin={accessLevel === 'admin'}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {editable ? (
                  <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCreate(country)}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue"
                    >
                      + Source
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}

      <GrandTotalsFooter
        sourcesCad={grandTotals.sourcesCad}
        sourcesEur={grandTotals.sourcesEur}
        budgetCad={grandTotals.budgetCad}
      />
    </div>
  )
}

function CoherenceBadge({ diff, budgetCad, hasOrg }) {
  if (!hasOrg) {
    return (
      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
        Pas d'org de référence
      </span>
    )
  }
  const absDiff = Math.abs(diff)
  if (absDiff <= COHERENCE_TOLERANCE) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
        <span aria-hidden="true">✓</span> Cohérent
      </span>
    )
  }
  const sign = diff > 0 ? '+' : '−'
  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700"
      title={`Sources : ${formatOne(budgetCad + diff, 'CAD', { fractionDigits: 2 })} · Budget : ${formatOne(budgetCad, 'CAD', { fractionDigits: 2 })}`}
    >
      <span aria-hidden="true">⚠</span>
      Écart : {sign}{Number(absDiff).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} CAD
    </span>
  )
}

function GrandTotalsFooter({ sourcesCad, sourcesEur, budgetCad }) {
  const diff = sourcesCad - budgetCad
  const absDiff = Math.abs(diff)
  const coherent = absDiff <= COHERENCE_TOLERANCE
  return (
    <section className="rounded-lg border-2 border-slate-300 bg-slate-50 px-5 py-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grand total consolidé</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs text-slate-500">Sources (CAD / EUR)</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900">
            {formatOne(sourcesCad, 'CAD', { fractionDigits: 2 })}
          </div>
          <div className="text-xs tabular-nums text-slate-500">
            {formatOne(sourcesEur, 'EUR', { fractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Budgets producteur·rices (CAD)</div>
          <div className="text-lg font-semibold tabular-nums text-slate-900">{formatOne(budgetCad, 'CAD', { fractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Écart sources vs budget</div>
          <div className={`text-lg font-semibold tabular-nums ${coherent ? 'text-emerald-700' : 'text-red-700'}`}>
            {coherent ? '✓ Cohérent' : `${diff > 0 ? '+' : '−'}${formatOne(absDiff, 'CAD', { fractionDigits: 2 })}`}
          </div>
        </div>
      </div>
    </section>
  )
}

function SourceRow({ source, editable, isAdmin, onUpdate, onDelete }) {
  const [draft, setDraft] = useState({
    source_name: source.source_name,
    amount_eur:  source.amount_eur ?? '',
    amount_cad:  source.amount_cad ?? '',
    status:      source.status,
    notes:       source.notes ?? '',
  })

  function commitField(field, value) {
    if (value === source[field]) return
    onUpdate(source.id, { [field]: value })
  }

  function commitAmount(field) {
    const raw = draft[field]
    if (raw === '' || raw === null) {
      if (source[field] !== null) onUpdate(source.id, { [field]: null })
      return
    }
    const v = parseFloat(raw)
    if (Number.isNaN(v)) {
      setDraft(d => ({ ...d, [field]: source[field] ?? '' }))
      return
    }
    if (v !== Number(source[field])) onUpdate(source.id, { [field]: v })
  }

  const status = STATUS_LABEL[source.status] ?? { label: source.status, tone: 'bg-slate-100 text-slate-700' }

  return (
    <tr>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {editable ? (
            <input
              type="text"
              value={draft.source_name}
              onChange={(e) => setDraft(d => ({ ...d, source_name: e.target.value }))}
              onBlur={() => commitField('source_name', draft.source_name.trim() || source.source_name)}
              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          ) : (
            <span className="text-sm">{source.source_name}</span>
          )}
          <ModifiedBadge
            importedValue={source.imported_value}
            modifiedAt={source.last_modified_at}
            modifiedByName={source.last_modified_by_user?.full_name}
            fieldLabels={FUNDING_SOURCE_LABELS}
          />
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount_eur}
            onChange={(e) => setDraft(d => ({ ...d, amount_eur: e.target.value }))}
            onBlur={() => commitAmount('amount_eur')}
            placeholder="—"
            className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          <span className="text-sm tabular-nums">
            {source.amount_eur !== null && source.amount_eur !== undefined
              ? Number(source.amount_eur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
              : <span className="italic text-slate-400">—</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount_cad}
            onChange={(e) => setDraft(d => ({ ...d, amount_cad: e.target.value }))}
            onBlur={() => commitAmount('amount_cad')}
            placeholder="—"
            className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm tabular-nums hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          <span className="text-sm tabular-nums">
            {source.amount_cad !== null && source.amount_cad !== undefined
              ? Number(source.amount_cad).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
              : <span className="italic text-slate-400">—</span>}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <select
            value={draft.status}
            onChange={(e) => { setDraft(d => ({ ...d, status: e.target.value })); commitField('status', e.target.value) }}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="acquired">Acquis</option>
            <option value="expected">Pressenti</option>
          </select>
        ) : (
          <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status.tone}`}>
            {status.label}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">
        {editable ? (
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
            onBlur={() => commitField('notes', draft.notes.trim() || null)}
            placeholder="—"
            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        ) : (
          source.notes ? <span>{source.notes}</span> : <span className="italic text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {editable && isAdmin ? (
            <select
              value={source.country}
              onChange={(e) => onUpdate(source.id, { country: e.target.value })}
              title="Réaffecter à un autre pays (admin)"
              className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 hover:border-slate-200 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="CA">🇨🇦 CA</option>
              <option value="FR">🇫🇷 FR</option>
              <option value="LU">🇱🇺 LU</option>
            </select>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={() => onDelete(source.id)}
              title="Supprimer la source"
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9.5h5L11 4M7 7v4M9 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
