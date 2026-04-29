import { useAuth } from '../lib/AuthProvider.jsx'
import { useCurrentProject } from '../lib/useCurrentProject.js'
import ProducerAccessSection from '../components/parametres/ProducerAccessSection.jsx'
import ExchangeRateSection from '../components/parametres/ExchangeRateSection.jsx'
import ChangePasswordSection from '../components/parametres/ChangePasswordSection.jsx'

export default function Parametres() {
  const { profile } = useAuth()
  const { projectId, accessLevel, loading } = useCurrentProject()
  const isAdmin = accessLevel === 'admin'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestion de votre compte et configuration du projet.
        </p>
      </header>

      {loading ? (
        <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : (
        <>
          {/* Section ouverte à tous : changer son mot de passe */}
          <ChangePasswordSection />

          {/* Sections admin only : configuration projet */}
          {isAdmin ? (
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
          ) : null}
        </>
      )}
    </div>
  )
}
