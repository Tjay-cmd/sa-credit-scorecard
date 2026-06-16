import { useEffect, useState } from 'react'
import { getWoeTables } from '../api/client.js'

function woeCellStyle(woe) {
  // Positive WOE = more goods than bads in the bin (green); negative = red.
  const intensity = Math.min(Math.abs(woe) / 1.5, 1)
  const alpha = 0.12 + intensity * 0.45
  return {
    backgroundColor:
      woe >= 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`,
  }
}

function ivStrength(iv) {
  if (iv >= 0.3) return { label: 'Strong', cls: 'bg-emerald-100 text-emerald-700' }
  if (iv >= 0.1) return { label: 'Medium', cls: 'bg-sky-100 text-sky-700' }
  if (iv >= 0.02) return { label: 'Weak', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Not predictive', cls: 'bg-slate-100 text-slate-500' }
}

export default function WoeTables() {
  const [tables, setTables] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWoeTables()
      .then((d) => setTables(d.tables))
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">WOE Tables</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Weight of Evidence and Information Value per variable, sorted by IV descending.
          Variables with IV &lt; 0.02 are excluded from the model.
        </p>
      </div>

      {loading && <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {String(error)} — train the model from the Dashboard first.
        </div>
      )}

      {tables?.map((table) => {
        const strength = ivStrength(table.iv)
        return (
          <div
            key={table.feature}
            className={`bg-white rounded-xl shadow-sm border p-5 ${
              table.selected ? 'border-slate-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h3 className="font-semibold text-slate-800">{table.feature}</h3>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                IV = {table.iv.toFixed(4)}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${strength.cls}`}>
                {strength.label}
              </span>
              {!table.selected && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Dropped (IV &lt; 0.02)
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4 font-medium">Bin</th>
                    <th className="py-2 pr-4 font-medium text-right">Count</th>
                    <th className="py-2 pr-4 font-medium text-right">Bad rate</th>
                    <th className="py-2 pr-4 font-medium text-right">% of goods</th>
                    <th className="py-2 pr-4 font-medium text-right">% of bads</th>
                    <th className="py-2 pr-4 font-medium text-right">WOE</th>
                    <th className="py-2 font-medium text-right">IV contrib.</th>
                  </tr>
                </thead>
                <tbody>
                  {table.bins.map((bin) => (
                    <tr key={bin.bin} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700">{bin.bin}</td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {bin.count.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {(bin.bad_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {(bin.pct_goods * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-600">
                        {(bin.pct_bads * 100).toFixed(1)}%
                      </td>
                      <td
                        className="py-2 pr-4 text-right font-mono text-xs font-semibold text-slate-800 rounded"
                        style={woeCellStyle(bin.woe)}
                      >
                        {bin.woe >= 0 ? '+' : ''}
                        {bin.woe.toFixed(3)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-slate-600">
                        {bin.iv_contribution.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
