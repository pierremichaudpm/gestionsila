import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  countryFlag,
  countryName,
  COUNTRY_OPTIONS,
  PRODUCER_FOLDER_OPTIONS,
  producerFolder,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

// Édition d'un document confidentiel (producer_documents). Mêmes champs que
// EditDocumentModal mais sans la catégorie : producer_documents n'a que
// les sous-dossiers assurances / legal.
export default function EditProducerDocumentModal({ open, onClose, doc, lots, accessLevel, onSaved, onDeleted }) {
  const isAdmin = accessLevel === 'admin'
  const [form, setForm] = useState(buildForm(doc))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(buildForm(doc))
      setError(null)
    }
  }, [open, doc])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!doc) return
    setSubmitting(true)
    setError(null)

    const versionInt = parseInt(form.version, 10)
    if (Number.isNaN(versionInt) || versionInt < 1) {
      setError('Version invalide.')
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('producer_documents')
      .update({
        title: form.title,
        drive_url: form.drive_url,
        folder: form.folder,
        version: versionInt,
        version_devis: form.folder === 'devis_initiaux' ? (form.version_devis || null) : null,
        lot_id: form.lot_id || null,
        country: form.country,
      })
      .eq('id', doc.id)

    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    onSaved()
  }

  async function handleDelete() {
    if (!doc) return
    if (!window.confirm(`Supprimer la fiche « ${doc.title} » ? Le fichier reste sur Drive ; seule la fiche dans l'outil disparaît. Action irréversible.`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase
      .from('producer_documents')
      .delete()
      .eq('id', doc.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onDeleted()
  }

  return (
    <Modal open={open} onClose={onClose} title="Modifier le document confidentiel">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Titre" required>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <Field label="URL Google Drive" required>
          <input
            type="url"
            required
            value={form.drive_url}
            onChange={(e) => update('drive_url', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sous-dossier" required>
            <select
              required
              value={form.folder}
              onChange={(e) => update('folder', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {PRODUCER_FOLDER_OPTIONS.map(f => (
                <option key={f} value={f}>{producerFolder(f).label}</option>
              ))}
            </select>
          </Field>
          <Field label="Version" required>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={form.version}
              onChange={(e) => update('version', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm tabular-nums focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </Field>
        </div>

        {form.folder === 'devis_initiaux' ? (
          <Field label="Version du devis">
            <input
              type="text"
              value={form.version_devis}
              onChange={(e) => update('version_devis', e.target.value)}
              placeholder="ex. v1 — dépôt SODEC mars 2026"
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tableau">
            <select
              value={form.lot_id}
              onChange={(e) => update('lot_id', e.target.value)}
              className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Transversal (aucun tableau)</option>
              {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Pays">
            {isAdmin ? (
              <select
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                {COUNTRY_OPTIONS.map(c => (
                  <option key={c} value={c}>{countryFlag(c)} {countryName(c)}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={`${countryFlag(form.country)} ${countryName(form.country)}`}
                className="block w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            )}
          </Field>
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Supprimer
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function buildForm(doc) {
  return {
    title:         doc?.title ?? '',
    drive_url:     doc?.drive_url ?? '',
    folder:        doc?.folder ?? 'assurances',
    version:       doc?.version ?? 1,
    version_devis: doc?.version_devis ?? '',
    lot_id:        doc?.lot_id ?? '',
    country:       doc?.country ?? 'CA',
  }
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}{required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
