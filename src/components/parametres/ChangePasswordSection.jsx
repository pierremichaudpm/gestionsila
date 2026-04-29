import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// Section ouverte à tous les utilisateurs (pas seulement admin) — chaque
// personne peut changer son propre mot de passe ici. Utilise
// supabase.auth.updateUser({ password }) qui agit sur la session courante.
export default function ChangePasswordSection() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setPassword('')
    setConfirm('')
    setTimeout(() => setSuccess(false), 5000)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-brand-navy">Changer mon mot de passe</h2>
        <p className="text-xs text-slate-500">
          Met à jour le mot de passe de votre compte. Vous resterez connectée après le
          changement.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cp-password" className="block text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </label>
            <input
              id="cp-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label htmlFor="cp-confirm" className="block text-sm font-medium text-slate-700">
              Confirmer
            </label>
            <input
              id="cp-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">8 caractères minimum.</p>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Mot de passe mis à jour.
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </div>
      </form>
    </section>
  )
}
