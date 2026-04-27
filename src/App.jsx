import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Production from './pages/Production.jsx'
import Lots from './pages/Lots.jsx'
import LotDetail from './pages/LotDetail.jsx'
import Documents from './pages/Documents.jsx'
import Livrables from './pages/Livrables.jsx'
import Equipe from './pages/Equipe.jsx'
import Parametres from './pages/Parametres.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/production" replace />} />
          <Route path="/production" element={<Production />} />
          <Route path="/lots" element={<Lots />} />
          <Route path="/lots/:id" element={<LotDetail />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/livrables" element={<Livrables />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="*" element={<Navigate to="/production" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
