import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-x-auto">
        <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          <Outlet />
        </div>
        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          Propulsé par Studio Micho · Jaxa
        </footer>
      </main>
    </div>
  )
}
