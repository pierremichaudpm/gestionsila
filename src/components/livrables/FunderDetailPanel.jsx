import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDualString } from '../../lib/currency'
import {
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  daysUntil,
  deliverableStatus,
  formatDate,
  funderStatus,
  FUNDER_STATUS_OPTIONS,
  toneClass,
} from '../../lib/format'
import SlideOver from '../ui/SlideOver.jsx'
import CommentThread from '../comments/CommentThread.jsx'
import CommentBadge from '../comments/CommentBadge.jsx'
import { useCommentCounts } from '../comments/useCommentCounts.js'

// Panneau coulissant détail d'un bailleur. Trois zones :
//   1. Édition des champs du bailleur (admin) ou lecture (autres rôles)
//   2. Action archive/désarchive (admin)
//   3. Liste des livrables avec leurs threads commentaires
//
// Les non-admin voient les champs en lecture seule. Le panneau s'ouvre aussi
// pour les bailleurs archivés (Section Archive de la page Livrables).

export default function FunderDetailPanel({
  open,
  funder,
  organizations,
  projectId,
  accessLevel,
  rates,
  onClose,
  onSaved,
  onArchiveChange,
}) {
  const isAdmin = accessLevel === 'admin'
  const [form, setForm] = useState(buildForm(funder))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [deliverablesLoading, setDeliverablesLoading] = useState(false)
  const [expandedDeliverableId, setExpandedDeliverableId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const deliverableIds = useMemo(() => deliverables.map(d => d.id), [deliverables])
  const commentCounts = useCommentCounts(projectId, 'deliverable', deliverableIds, reloadKey)

  useEffect(() => {
    if (!open) return
    setForm(buildForm(funder))
    setError(null)
    setExpandedDeliverableId(null)
  }, [open, funder])

  useEffect(() => {
    if (!open || !funder?.id) return
    let alive = true
    setDeliverablesLoading(true)
    supabase
      .from('deliverables')
      .select('id, title, due_date, status, notes')
      .eq('funder_id', funder.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .then(({ data, error: dErr }) => {
        if (!alive) return
        setDeliverablesLoading(false)
        if (dErr) {
          setError(dErr.message)
          return
        }
        setDeliverables(data ?? [])
      })
    return () => { alive = false }
  }, [open, funder?.id, reloadKey])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!funder || !isAdmin) return
    setSubmitting(true)
    setError(null)
    const patch = {
      name: form.name,
      country: form.country,
      amount: form.amount === '' ? null : Number(form.amount),
      currency: form.currency,
      status: form.status,
      beneficiary_org_id: form.beneficiary_org_id || null,
      notes: form.notes || null,
    }
    const { error: updateError } = await supabase
      .from('funders')
      .update(patch)
      .eq('id', funder.id)
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onSaved?.()
  }

  async function handleToggleArchive() {
    if (!funder || !isAdmin) return
    const next = !funder.archived
    const verb = next ? 'archiver' : 'désarchiver'
    if (!window.confirm(`${next ? 'Archiver' : 'Désarchiver'} le bailleur « ${funder.name} » ?`)) return
    setSubmitting(true)
    const { error: archiveError } = await supabase
      .from('funders')
      .update({ archived: next })
      .eq('id', funder.id)
    setSubmitting(false)
    if (archiveError) {
      setError(`Impossible de ${verb} : ${archiveError.message}`)
      return
    }
    onArchiveChange?.()
  }

  if (!funder) {
    return <SlideOver open={open} onClose={onClose} title="Bailleur" />
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={funder.name}
      subtitle={`${countryFlag(funder.country)} ${countryName(funder.country)} · ${formatDualString(funder.amount, funder.currency, rates)}`}
      width="xl"
    >
      <div className="space-y-6 px-6 py-5">
        {funder.archived ? (
          <div className="rounded border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
            Bailleur archivé
          </div>
        ) : null}

        {/* ─── Édition / lecture des champs ─────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Détails du bailleur
          </h3>

          <Field label="Nom" required>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={inputCls(!isAdmin)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pays">
              {isAdmin ? (
                <select
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className={inputCls(false)}
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
                  ))}
                </select>
              ) : (
                <input
                  readOnly
                  value={`${countryFlag(form.country)} ${countryName(form.country)}`}
                  className={inputCls(true)}
                />
              )}
            </Field>
            <Field label="Statut">
              {isAdmin ? (
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className={inputCls(false)}
                >
                  {FUNDER_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{funderStatus(s).label}</option>
                  ))}
                </select>
              ) : (
                <input
                  readOnly
                  value={funderStatus(form.status).label}
                  className={inputCls(true)}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Montant">
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!isAdmin}
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                className={inputCls(!isAdmin)}
              />
            </Field>
            <Field label="Devise">
              {isAdmin ? (
                <select
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="CAD">CAD</option>
                  <option value="EUR">EUR</option>
                </select>
              ) : (
                <input readOnly value={form.currency} className={inputCls(true)} />
              )}
            </Field>
          </div>

          <Field label="Bénéficiaire">
            {isAdmin ? (
              <select
                value={form.beneficiary_org_id}
                onChange={(e) => update('beneficiary_org_id', e.target.value)}
                className={inputCls(false)}
              >
                <option value="">— Aucun —</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            ) : (
              <input
                readOnly
                value={organizations.find(o => o.id === form.beneficiary_org_id)?.name ?? '—'}
                className={inputCls(true)}
              />
            )}
          </Field>

          <Field label="Notes">
            <textarea
              rows={3}
              disabled={!isAdmin}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={inputCls(!isAdmin)}
            />
          </Field>

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {isAdmin ? (
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleToggleArchive}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
              >
                {funder.archived ? 'Désarchiver' : 'Archiver'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          ) : null}
        </form>

        {/* ─── Livrables + threads ──────────────────────────────────── */}
        <section className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Livrables
            <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-slate-400">
              {deliverables.length} {deliverables.length > 1 ? 'livrables' : 'livrable'}
            </span>
          </h3>

          {deliverablesLoading ? (
            <div className="h-12 animate-pulse rounded border border-slate-200 bg-slate-50" />
          ) : deliverables.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun livrable enregistré pour ce bailleur.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {deliverables.map(d => (
                <DeliverableItem
                  key={d.id}
                  deliverable={d}
                  expanded={expandedDeliverableId === d.id}
                  onToggle={() => setExpandedDeliverableId(prev => prev === d.id ? null : d.id)}
                  commentCount={commentCounts.get(d.id) ?? 0}
                  projectId={projectId}
                  onCommentChange={() => setReloadKey(k => k + 1)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </SlideOver>
  )
}

function DeliverableItem({ deliverable, expanded, onToggle, commentCount, projectId, onCommentChange }) {
  const days = daysUntil(deliverable.due_date)
  const overdue = days !== null && days < 0 && !['submitted', 'validated'].includes(deliverable.status)
  const status = deliverableStatus(deliverable.status)
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900">{deliverable.title}</div>
          {deliverable.notes ? (
            <div className="mt-0.5 text-xs italic text-slate-500 whitespace-pre-wrap">{deliverable.notes}</div>
          ) : null}
        </div>
        <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
          {formatDate(deliverable.due_date)}
          {overdue ? ' (en retard)' : ''}
        </span>
        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${toneClass(status.tone)}`}>
          {status.label}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="rounded px-1.5 py-1 hover:bg-slate-100"
          title={expanded ? 'Masquer les commentaires' : 'Afficher les commentaires'}
        >
          <CommentBadge count={commentCount} />
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <CommentThread
            projectId={projectId}
            entityType="deliverable"
            entityId={deliverable.id}
            onCountChange={onCommentChange}
          />
        </div>
      ) : null}
    </li>
  )
}

function buildForm(funder) {
  return {
    name:               funder?.name ?? '',
    country:            funder?.country ?? 'CA',
    amount:             funder?.amount?.toString() ?? '',
    currency:           funder?.currency ?? 'CAD',
    status:             funder?.status ?? 'to_confirm',
    beneficiary_org_id: funder?.beneficiary_org_id ?? '',
    notes:              funder?.notes ?? '',
  }
}

function inputCls(readOnly) {
  return readOnly
    ? 'block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'
    : 'block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue'
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
