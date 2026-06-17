import { useEffect, useMemo, useState } from 'react'
import { getWoeTables } from '../api/client.js'

function woeCellClass(woe) {
  if (Math.abs(woe) < 0.05) {
    return 'bg-[#5A8080]/10 text-[#8BAAAA] border border-[#3D6666]/30'
  }
  if (woe >= 0) {
    return 'bg-[rgba(0,205,183,0.12)] text-[#00CDB7] border border-[rgba(0,205,183,0.2)]'
  }
  return 'bg-[rgba(239,68,68,0.12)] text-[#EF4444] border border-[rgba(239,68,68,0.2)]'
}

function ivStrength(table) {
  if (!table.selected) {
    return {
      label: 'Dropped',
      badgeCls:
        'bg-[#5A8080]/10 text-[#8BAAAA] border border-[#3D6666]',
      barColor: '#5A8080',
    }
  }
  if (table.iv >= 0.1) {
    return {
      label: 'Strong',
      badgeCls:
        'bg-[rgba(0,205,183,0.1)] text-[#00CDB7] border border-teal-800',
      barColor: '#00CDB7',
    }
  }
  if (table.iv >= 0.02) {
    return {
      label: 'Medium',
      badgeCls:
        'bg-[rgba(251,191,36,0.1)] text-[#FBBF24] border border-yellow-800',
      barColor: '#FBBF24',
    }
  }
  return {
    label: 'Weak',
    badgeCls:
      'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-red-900',
    barColor: '#EF4444',
  }
}

function IvBar({ iv, barColor }) {
  const width = Math.min((iv / 0.35) * 100, 100)
  return (
    <div className="h-[3px] w-full bg-[#0D2222] rounded-sm my-2.5 mb-4">
      <div
        className="h-full rounded-sm transition-all duration-200"
        style={{ width: `${width}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

function Chevron({ collapsed }) {
  return (
    <svg
      className={`w-4 h-4 text-[#8BAAAA] shrink-0 transition-transform duration-200 ${
        collapsed ? '' : 'rotate-90'
      }`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#00CDB7]' : 'bg-[#1A3D3D]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-xs text-[#8BAAAA]">{label}</span>
    </label>
  )
}

export default function WoeTables() {
  const [tables, setTables] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDropped, setShowDropped] = useState(false)
  const [collapsed, setCollapsed] = useState(new Set())

  useEffect(() => {
    getWoeTables()
      .then((d) => setTables(d.tables))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tables) {
      setCollapsed(new Set(tables.filter((t) => !t.selected).map((t) => t.feature)))
    }
  }, [tables])

  const stats = useMemo(() => {
    if (!tables?.length) {
      return { total: 0, inModel: 0, dropped: 0, avgIv: 0 }
    }
    const inModel = tables.filter((t) => t.selected)
    const dropped = tables.filter((t) => !t.selected)
    const avgIv =
      inModel.length > 0
        ? inModel.reduce((sum, t) => sum + t.iv, 0) / inModel.length
        : 0
    return {
      total: tables.length,
      inModel: inModel.length,
      dropped: dropped.length,
      avgIv,
    }
  }, [tables])

  const visibleTables = useMemo(() => {
    if (!tables) return []
    return tables.filter((t) => showDropped || t.selected)
  }, [tables, showDropped])

  const toggleCollapse = (feature) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(feature)) next.delete(feature)
      else next.add(feature)
      return next
    })
  }

  return (
    <div className="page-container">
      <header className="border-b border-[#1A3D3D] pb-5 mb-6 md:mb-7">
        <h2 className="page-title">WOE tables</h2>
        <p className="text-[13px] text-[#8BAAAA] mt-1">
          Weight of Evidence and Information Value by variable. Sorted by IV descending. Variables
          with IV below 0.02 are excluded from the model.
        </p>
        {tables && (
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              `Variables in model: ${stats.inModel}`,
              `Avg IV: ${stats.avgIv.toFixed(3)}`,
              `Dropped (IV < 0.02): ${stats.dropped}`,
            ].map((pill) => (
              <span
                key={pill}
                className="bg-[#0D2222] border border-[#1A3D3D] text-slate-300 text-xs rounded-full px-3 py-1"
              >
                {pill}
              </span>
            ))}
          </div>
        )}
      </header>

      {loading && (
        <div className="text-[#8BAAAA] text-sm py-12 text-center">Loading…</div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 text-sm">
          {String(error)}. Train the model from the Dashboard first.
        </div>
      )}

      {tables && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex flex-wrap items-center gap-5">
              <Toggle
                checked={showDropped}
                onChange={setShowDropped}
                label="Show dropped variables"
              />
              <span className="text-xs text-[#8BAAAA]">Sort by: IV desc</span>
            </div>
            <p className="text-xs text-[#5A8080]">
              {stats.total} variables · {stats.inModel} in model · {stats.dropped} dropped
            </p>
          </div>

          <div className="space-y-4">
            {visibleTables.map((table) => {
              const strength = ivStrength(table)
              const isCollapsed = collapsed.has(table.feature)
              const isDropped = !table.selected

              return (
                <div
                  key={table.feature}
                  className={`rounded-xl border p-5 md:px-6 ${
                    isDropped
                      ? 'bg-[#0B1E1E] border-[#143030] opacity-60'
                      : 'bg-[#112B2B] border-[#1A3D3D]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCollapse(table.feature)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap pr-2">
                      <Chevron collapsed={isCollapsed} />
                      <h3 className="font-mono font-bold text-[15px] text-white">
                        {table.feature}
                      </h3>
                      <span className="text-xs font-mono bg-[#0D2222] border border-[#1A3D3D] text-slate-300 rounded px-2 py-0.5 ml-1">
                        IV = {table.iv.toFixed(4)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${strength.badgeCls}`}
                      >
                        {strength.label}
                      </span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="transition-all duration-200">
                      <IvBar iv={table.iv} barColor={strength.barColor} />

                      {isDropped && (
                        <p className="text-[11px] text-[#3D6666] italic mb-3">
                          Excluded from the model (IV below 0.02).
                        </p>
                      )}

                      <div className="table-scroll-wrap w-full max-w-full min-w-0 rounded-lg">
                        <table className="w-full text-[13px] min-w-[640px]">
                          <thead>
                            <tr className="bg-[#0D2222] text-left">
                              {[
                                'Bin',
                                'Count',
                                'Bad rate',
                                '% of goods',
                                '% of bads',
                                'WOE',
                                'IV contrib.',
                              ].map((col, i) => (
                                <th
                                  key={col}
                                  className={`py-2 px-3 text-[11px] uppercase tracking-[0.08em] font-medium text-[#8BAAAA] border-b border-[#1A3D3D] ${
                                    i > 0 ? 'text-right' : ''
                                  }`}
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.bins.map((bin, rowIdx) => {
                              const isMissing = bin.bin === 'Missing'
                              return (
                                <tr
                                  key={bin.bin}
                                  className={`border-b border-[#1A3D3D]/50 transition-colors hover:bg-[#1A3D3D] ${
                                    rowIdx % 2 === 0 ? 'bg-[#112B2B]' : 'bg-[#0F2424]'
                                  } ${isMissing ? 'opacity-75' : ''} ${isDropped ? 'text-[#5A8080]' : ''}`}
                                >
                                  <td
                                    className={`py-2 px-3 font-mono text-[13px] ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-200'
                                    } ${isMissing ? 'italic' : ''}`}
                                  >
                                    {bin.bin}
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-300'
                                    }`}
                                  >
                                    {bin.count.toLocaleString()}
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-300'
                                    }`}
                                  >
                                    {(bin.bad_rate * 100).toFixed(1)}%
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-300'
                                    }`}
                                  >
                                    {(bin.pct_goods * 100).toFixed(1)}%
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-300'
                                    }`}
                                  >
                                    {(bin.pct_bads * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <span
                                      className={`inline-block min-w-[70px] rounded-md px-2 py-1 font-mono text-[13px] font-semibold text-center ${woeCellClass(
                                        bin.woe,
                                      )} ${isDropped ? '!text-[#5A8080] !bg-transparent !border-[#3D6666]' : ''}`}
                                    >
                                      {bin.woe >= 0 ? '+' : ''}
                                      {bin.woe.toFixed(3)}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-2 px-3 text-right font-mono ${
                                      isDropped ? 'text-[#5A8080]' : 'text-slate-300'
                                    }`}
                                  >
                                    {bin.iv_contribution.toFixed(4)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="table-scroll-hint">Scroll for more →</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
