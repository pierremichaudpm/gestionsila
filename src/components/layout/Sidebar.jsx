import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/production', label: 'Production' },
  { to: '/lots', label: 'Lots' },
  { to: '/documents', label: 'Documents' },
  { to: '/livrables', label: 'Livrables' },
  { to: '/equipe', label: 'Équipe' },
]

const linkClass = ({ isActive }) =>
  [
    'block rounded-lg px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-[color:var(--color-brand-navy)] text-white'
      : 'text-slate-200 hover:bg-white/10',
  ].join(' ')

export default function Sidebar() {
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

      <div className="px-3 py-4">
        <NavLink to="/parametres" className={linkClass}>
          Paramètres
        </NavLink>
      </div>
    </aside>
  )
}
