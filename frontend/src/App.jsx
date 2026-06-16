import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import InclusionAnalysis from './pages/InclusionAnalysis.jsx'
import ScoreApplicant from './pages/ScoreApplicant.jsx'
import WoeTables from './pages/WoeTables.jsx'

const navLinkClass = ({ isActive }) =>
  `block pl-4 pr-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] ${
    isActive
      ? 'border-[#00CDB7] bg-[#112B2B] text-white'
      : 'border-transparent text-[#8BAAAA] hover:text-white'
  }`

export default function App() {
  return (
    <div className="min-h-screen flex bg-[#091A1A]">
      <aside className="w-[220px] shrink-0 bg-[#091A1A] border-r border-[#1A3D3D] flex flex-col min-h-screen sticky top-0 h-screen">
        <div className="px-3 pt-4 pb-4 border-b border-[#1A3D3D] flex justify-center">
          <img
            src="/images/logo.png"
            alt="Credit Engine"
            className="w-[100px] rounded-xl"
          />
        </div>

        <nav className="flex-1 py-3 space-y-0.5">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/score" className={navLinkClass}>
            Score Applicant
          </NavLink>
          <NavLink to="/woe" className={navLinkClass}>
            WOE Tables
          </NavLink>
          <NavLink to="/inclusion" className={navLinkClass}>
            Inclusion Gap
          </NavLink>
        </nav>

        <div className="px-4 py-4 border-t border-[#1A3D3D]">
          <p className="text-[11px] text-[#5A8080] leading-snug">
            Home Credit Data · 307,511 rows
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-8 py-8 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/score" element={<ScoreApplicant />} />
          <Route path="/woe" element={<WoeTables />} />
          <Route path="/inclusion" element={<InclusionAnalysis />} />
        </Routes>
      </main>
    </div>
  )
}
