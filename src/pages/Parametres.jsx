import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject.js'
import ProducerAccessSection from '../components/parametres/ProducerAccessSection.jsx'
import ExchangeRateSection from '../components/parametres/ExchangeRateSection.jsx'

export default function Parametres() {
  const { profile } = useAuth()
  const { projectId, accessLevel, loading } = useCurrentProject()
  const isAdmin = accessLevel === 'admin'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestion administrative du projet.
        </p>
      </header>

      {loading ? (
        <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : !isAdmin ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Aucun paramètre disponible.</p>
          <p className="mt-1">
            Cette section est réservée aux administrateurs du projet. D'autres réglages
            (configuration projet, catégories de documents, taux de change) seront ajoutés
            ici en Phase 3.
          </p>
        </div>
      ) : (
        <>
          <ExchangeRateSection
            projectId={projectId}
            currentUserId={profile?.id}
          />
          <ProducerAccessSection
            projectId={projectId}
            currentUserId={profile?.id}
          />
        </>
      )}
    </div>
  )
}
