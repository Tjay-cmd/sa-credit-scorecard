import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import InclusionAnalysis from './pages/InclusionAnalysis.jsx'
import ScoreApplicant from './pages/ScoreApplicant.jsx'
import WoeTables from './pages/WoeTables.jsx'

const navLinkClass = ({ isActive }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
  }`

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-900 text-lg">
              R
            </div>
            <div>
              <h1 className="text-white font-semibold leading-tight">
                Credit Scorecard Engine
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                WOE-binned logistic regression · Home Credit data
              </p>
            </div>
          </div>
          <nav className="flex gap-1">
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
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
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
