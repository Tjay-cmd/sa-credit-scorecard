import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import InclusionAnalysis from './pages/InclusionAnalysis.jsx'
import Methodology from './pages/Methodology.jsx'
import ScoreApplicant from './pages/ScoreApplicant.jsx'
import WoeTables from './pages/WoeTables.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/score', label: 'Score applicant' },
  { to: '/woe', label: 'WOE tables' },
  { to: '/inclusion', label: 'Inclusion gap' },
  { to: '/methodology', label: 'Methodology' },
]

const navLinkClass = ({ isActive }) =>
  `block pl-4 pr-3 py-2.5 text-sm font-medium transition-colors border-l-[3px] min-h-[44px] flex items-center ${
    isActive
      ? 'border-[#00CDB7] bg-[#112B2B] text-white'
      : 'border-transparent text-[#8BAAAA] hover:text-white'
  }`

function HamburgerIcon({ open }) {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export default function App() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  const closeNav = () => setNavOpen(false)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#091A1A]">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#091A1A] border-b border-[#1A3D3D] flex items-center px-3 gap-3">
        <button
          type="button"
          onClick={() => setNavOpen((o) => !o)}
          className="flex items-center justify-center w-11 h-11 -ml-1 rounded-lg text-white hover:bg-[#112B2B] transition-colors shrink-0"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
        >
          <HamburgerIcon open={navOpen} />
        </button>
        <img
          src="/images/logo.png"
          alt=""
          className="w-8 h-8 rounded-lg shrink-0"
          aria-hidden
        />
        <span className="text-sm font-semibold text-white truncate">Credit Engine</span>
      </header>

      {/* Mobile drawer overlay */}
      {navOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={closeNav}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on tablet+ */}
      <aside
        className={`fixed md:sticky top-0 z-50 md:z-auto w-[260px] md:w-[200px] lg:w-[220px] shrink-0 bg-[#091A1A] border-r border-[#1A3D3D] flex flex-col min-h-screen h-screen transition-transform duration-300 ease-out ${
          navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="hidden md:flex px-3 pt-4 pb-4 border-b border-[#1A3D3D] justify-center">
          <img
            src="/images/logo.png"
            alt="Credit Engine"
            className="w-[88px] lg:w-[100px] rounded-xl"
          />
        </div>

        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-[#1A3D3D] shrink-0">
          <img src="/images/logo.png" alt="" className="w-8 h-8 rounded-lg" aria-hidden />
          <span className="text-sm font-semibold text-white">Credit Engine</span>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={navLinkClass} onClick={closeNav}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-[#1A3D3D] shrink-0">
          <p className="text-[11px] text-[#5A8080] leading-snug">
            Home Credit Data · 307,511 rows
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full px-4 py-6 pt-[4.5rem] md:px-6 md:py-8 md:pt-8 lg:px-8 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/score" element={<ScoreApplicant />} />
          <Route path="/woe" element={<WoeTables />} />
          <Route path="/inclusion" element={<InclusionAnalysis />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </main>
    </div>
  )
}
