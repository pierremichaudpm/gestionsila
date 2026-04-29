import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Page d'atterrissage du lien de récupération de mot de passe envoyé par
// Supabase Auth. À l'arrivée du clic depuis le courriel, Supabase a déjà
// validé le token et établi une session. L'utilisateur est techniquement
// connecté — on le garde sur cette page jusqu'à ce qu'il choisisse un
// nouveau mot de passe.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [hasSession, setHasSession] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(!!data.session)
    })
    return () => { alive = false }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

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
    setTimeout(() => navigate('/production', { replace: true }), 1500)
  }

  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="h-10 w-40 animate-pulse rounded bg-slate-200" />
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Gestion SILA</div>
            <h1 className="mt-1 text-xl font-semibold text-brand-navy">Lien expiré ou invalide</h1>
          </div>
          <p className="text-sm text-slate-600">
            Le lien de récupération est expiré ou n'est plus valide. Demandez à
            l'administrateur du projet de vous renvoyer une invitation, ou utilisez
            « Mot de passe oublié » sur l'écran de connexion.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">Gestion SILA</div>
          <h1 className="mt-1 text-xl font-semibold text-brand-navy">
            Choisir un mot de passe
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Choisissez un mot de passe pour accéder à l'outil. Vous pourrez le modifier
            plus tard depuis vos paramètres.
          </p>
        </div>

        {success ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            Mot de passe enregistré. Redirection en cours…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
              />
              <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                Confirmer
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
              />
            </div>

            {error ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
