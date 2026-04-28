import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Production from './pages/Production.jsx'
import Calendrier from './pages/Calendrier.jsx'
import Lots from './pages/Lots.jsx'
import LotDetail from './pages/LotDetail.jsx'
import Documents from './pages/Documents.jsx'
import Livrables from './pages/Livrables.jsx'
import Budget from './pages/Budget.jsx'
import Equipe from './pages/Equipe.jsx'
import Parametres from './pages/Parametres.jsx'
import ProducerDocuments from './pages/ProducerDocuments.jsx'
import { useCurrentProject } from './lib/useCurrentProject.js'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/production" replace />} />
          <Route path="/production" element={<Production />} />
          <Route path="/calendrier" element={<Calendrier />} />
          <Route path="/lots" element={<Lots />} />
          <Route path="/lots/:id" element={<LotDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:folder" element={<Documents />} />
          <Route path="/livrables" element={<Livrables />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/parametres" element={<Parametres />} />

          <Route path="/espace-producteurs/assurances" element={<ProducerGate><ProducerDocuments /></ProducerGate>} />
          <Route path="/espace-producteurs/legal"      element={<ProducerGate><ProducerDocuments /></ProducerGate>} />
          <Route path="/espace-producteurs/budget"     element={<ProducerGate><Budget /></ProducerGate>} />

          {/* Ancienne route /budget : redirige vers Espace Producteurs si accès,
              sinon vers le tableau de contrôle. */}
          <Route path="/budget" element={<BudgetRedirect />} />

          <Route path="*" element={<Navigate to="/production" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

// Garde-fou côté UI. La RLS Supabase reste la source de vérité ; ce gate évite
// d'afficher une page vide / un flash si l'utilisateur arrive sur une URL
// confidentielle sans accès.
function ProducerGate({ children }) {
  const { hasProducerAccess, loading } = useCurrentProject()
  if (loading) return null
  if (!hasProducerAccess) return <Navigate to="/production" replace />
  return children
}

function BudgetRedirect() {
  const { hasProducerAccess, loading } = useCurrentProject()
  if (loading) return null
  return <Navigate to={hasProducerAccess ? '/espace-producteurs/budget' : '/production'} replace />
}
