import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider.jsx'

const NAV_ITEMS = [
  { to: '/production', label: 'Production' },
  { to: '/calendrier', label: 'Calendrier' },
  { to: '/lots', label: 'Lots' },
  { to: '/documents', label: 'Documents' },
  { to: '/livrables', label: 'Livrables' },
  { to: '/budget', label: 'Budget' },
  { to: '/equipe', label: 'Équipe' },
]

const DISCORD_URL = '#'

const linkClass = ({ isActive }) =>
  [
    'block rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-200 hover:bg-white/10',
  ].join(' ')

export default function Sidebar() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const displayName = profile?.full_name ?? user?.email ?? '—'

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[color:var(--color-brand-navy)] text-white">
      <div className="px-5 py-6">
        <div className="text-xs uppercase tracking-wide text-slate-300">Projet</div>
        <div className="mt-1 text-sm font-semibold leading-tight">
          SILA — Héroïnes Arctiques
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 px-3 py-3">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <DiscordIcon />
          <span>Discord</span>
          <ExternalIcon />
        </a>
        <NavLink to="/parametres" className={linkClass}>
          Paramètres
        </NavLink>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="text-xs uppercase tracking-wide text-slate-300">Connecté</div>
        <div className="mt-1 truncate text-sm font-medium leading-tight">
          {displayName}
        </div>
        {profile?.country ? (
          <div className="mt-0.5 text-xs text-slate-300">{profile.country}</div>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-3 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.6-.717 1.385-.98 2.003a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-.997-2.003.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.18 4.369a.07.07 0 0 0-.032.027C2.49 8.226 1.834 11.985 2.158 15.7a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.372.292a.077.077 0 0 1-.006.128c-.598.349-1.22.645-1.873.891a.077.077 0 0 0-.04.106c.36.7.772 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-4.255-.838-7.984-3.549-11.304a.061.061 0 0 0-.031-.028zM8.02 13.464c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.974 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.418 2.156-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/>
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="ml-auto opacity-60" aria-hidden="true">
      <path d="M4.5 2h-2A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11h6A1.5 1.5 0 0 0 10 9.5v-2M7 1h4v4M5 7l5.5-5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
