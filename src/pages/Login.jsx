import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider.jsx'

export default function Login() {
  const { session, signIn, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'forgot-sent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname ?? '/production'

  if (!loading && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await signIn(email, password)
    setSubmitting(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    navigate(from, { replace: true })
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSubmitting(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setMode('forgot-sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">Gestion SILA</div>
          <h1 className="mt-1 text-xl font-semibold text-brand-navy">
            {mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}
          </h1>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Courriel
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setPassword('') }}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Entrez votre courriel. Nous vous enverrons un lien pour choisir un nouveau mot
              de passe.
            </p>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                Courriel
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-brand-blue)]"
              />
            </div>

            {error ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null) }}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-brand-blue)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </div>
          </form>
        ) : (
          // forgot-sent
          <div className="space-y-4">
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <p className="font-medium">Courriel envoyé</p>
              <p className="mt-1">
                Si un compte existe pour <strong>{email}</strong>, un lien de récupération
                vient d'être envoyé. Vérifiez votre boîte de réception (et le dossier
                courriers indésirables).
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
