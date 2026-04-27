import { useCurrentProject } from '../lib/useCurrentProject.js'
import AttentionBlock from '../components/production/AttentionBlock.jsx'
import LotsBlock from '../components/production/LotsBlock.jsx'
import UpcomingDeliverablesBlock from '../components/production/UpcomingDeliverablesBlock.jsx'
import RecentActivityBlock from '../components/production/RecentActivityBlock.jsx'

export default function Production() {
  const { projectId, project, loading, error } = useCurrentProject()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Tableau de contrôle</h1>
        {loading ? (
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-slate-200" />
        ) : project ? (
          <p className="mt-1 text-sm text-slate-500">{project.name}</p>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-medium">Impossible de charger le projet actif.</p>
          <p className="mt-1 text-red-600">{error.message}</p>
        </div>
      ) : !loading && !projectId ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Aucun projet actif.</p>
          <p className="mt-1">
            Connectez-vous pour accéder à votre tableau de contrôle. Si vous êtes déjà authentifié,
            vérifiez que vous êtes membre d'un projet.
          </p>
        </div>
      ) : (
        <>
          <AttentionBlock projectId={projectId} />
          <LotsBlock projectId={projectId} />
          <UpcomingDeliverablesBlock projectId={projectId} />
          <RecentActivityBlock projectId={projectId} />
        </>
      )}
    </div>
  )
}
