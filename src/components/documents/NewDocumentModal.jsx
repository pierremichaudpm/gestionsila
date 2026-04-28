import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  documentCategory,
  DOCUMENT_CATEGORY_OPTIONS,
} from '../../lib/format'
import Modal from '../ui/Modal.jsx'

const INITIAL = {
  title: '',
  drive_url: '',
  category: 'contract',
  lot_id: '',
}

export default function NewDocumentModal({ open, onClose, projectId, userCountry, userId, lots, onCreated }) {
  const [form, setForm] = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(INITIAL)
      setError(null)
    }
  }, [open])

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!projectId || !userId || !userCountry) {
      setError('Profil utilisateur incomplet — impossible d\'enregistrer.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { data: existing, error: lookupError } = await supabase
      .from('documents')
      .select('version')
      .eq('project_id', projectId)
      .eq('title', form.title)
      .order('version', { ascending: false })
      .limit(1)

    if (lookupError) {
      setError(lookupError.message)
      setSubmitting(false)
      return
    }

    const version = existing && existing.length > 0 ? existing[0].version + 1 : 1

    const { error: insertError } = await supabase.from('documents').insert({
      project_id: projectId,
      lot_id: form.lot_id || null,
      uploaded_by: userId,
      title: form.title,
      category: form.category,
      country: userCountry,
      version,
      validation_status: 'draft',
      drive_url: form.drive_url,
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    onCreated()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau document">
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
            placeholder="https://drive.google.com/..."
            value={form.drive_url}
            onChange={(e) => update('drive_url', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </Field>

        <Field label="Catégorie">
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {DOCUMENT_CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>{documentCategory(c)}</option>
            ))}
          </select>
        </Field>

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

        <p className="text-xs text-slate-500">
          Pays : <strong>{userCountry ?? '—'}</strong> · Statut initial : <strong>Brouillon</strong>
          {form.title ? ' · Version auto-incrémentée' : ''}
        </p>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
      </form>
    </Modal>
  )
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
