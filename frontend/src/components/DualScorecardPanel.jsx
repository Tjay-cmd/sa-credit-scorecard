const SCORECARD_METRICS = [
  { key: 'auc', label: 'AUC (holdout)', fmt: (v) => v.toFixed(3), colorize: true },
  { key: 'gini', label: 'Gini', fmt: (v) => v.toFixed(3) },
  { key: 'ks', label: 'KS statistic', fmt: (v) => v.toFixed(3) },
  { key: 'train_auc', label: 'AUC (train)', fmt: (v) => v.toFixed(3) },
  { key: 'mean_score', label: 'Mean score', fmt: (v) => Math.round(v), scorecardOnly: true },
]

const COLUMNS = [
  { key: 'traditional', label: 'Traditional', color: '#00CDB7' },
  { key: 'alternative', label: 'Alternative', color: '#A78BFA' },
  { key: 'xgboost_benchmark', label: 'XGBoost', color: '#FBBF24', benchmark: true },
]

function cellValue(model, metric) {
  if (!model) return '—'
  if (metric.scorecardOnly && model.is_benchmark) return '—'
  const v = model[metric.key]
  return v != null ? metric.fmt(v) : '—'
}

export default function DualScorecardPanel({ traditional, alternative, xgboostBenchmark }) {
  const models = {
    traditional,
    alternative,
    xgboost_benchmark: xgboostBenchmark,
  }

  return (
    <div className="bg-[#112B2B] rounded-xl border border-[#1A3D3D] p-5">
      <h3 className="text-white text-sm font-semibold uppercase tracking-[0.05em] mb-1">
        Model Comparison
      </h3>
      <p className="text-xs text-[#8BAAAA] mb-4 leading-relaxed">
        Traditional and Alternative are production WOE scorecards. XGBoost is a
        discrimination benchmark on the same features — not used for decisions.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[#1A3D3D]">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="bg-[#0D2222] text-left">
              <th className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-widest text-[#8BAAAA]">
                Metric
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-2.5 px-3 text-[11px] font-medium uppercase tracking-widest text-right"
                  style={{ color: col.color }}
                >
                  {col.label}
                  {col.benchmark && (
                    <span className="block font-normal normal-case tracking-normal text-[10px] text-[#5A8080]">
                      benchmark
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCORECARD_METRICS.map((metric, rowIdx) => (
              <tr
                key={metric.key}
                className={rowIdx % 2 === 0 ? 'bg-[#112B2B]' : 'bg-[#0F2424]'}
              >
                <td className="py-2.5 px-3 text-slate-300">{metric.label}</td>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="py-2.5 px-3 text-right font-mono font-semibold text-white"
                    style={
                      metric.colorize && models[col.key]?.[metric.key] != null
                        ? { color: col.color }
                        : undefined
                    }
                  >
                    {cellValue(models[col.key], metric)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-[#0F2424]">
              <td className="py-2.5 px-3 text-slate-300">Cutoffs (accept / refer)</td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className="py-2.5 px-3 text-right font-mono font-semibold text-white"
                >
                  {col.benchmark || !models[col.key]?.thresholds
                    ? '—'
                    : `${models[col.key].thresholds.accept} / ${models[col.key].thresholds.refer}`}
                </td>
              ))}
            </tr>
            <tr className="bg-[#112B2B]">
              <td className="py-2.5 px-3 text-slate-300">Decision mix (A / R / X)</td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2.5 px-3 text-right font-mono text-xs text-slate-300">
                  {col.benchmark || !models[col.key]?.decision_mix_pct
                    ? '—'
                    : `${models[col.key].decision_mix_pct.accept}% / ${models[col.key].decision_mix_pct.refer}% / ${models[col.key].decision_mix_pct.reject}%`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {xgboostBenchmark?.shap_importance?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1A3D3D]">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#8BAAAA] mb-2">
            XGBoost — top features by mean |SHAP|
          </p>
          <div className="flex flex-wrap gap-2">
            {xgboostBenchmark.shap_importance.slice(0, 8).map((item) => (
              <span
                key={item.feature}
                className="text-[11px] font-mono bg-[#0D2222] text-slate-300 border border-[#1A3D3D] rounded px-2 py-0.5"
              >
                {item.feature}{' '}
                <span className="text-[#00CDB7]">{item.mean_abs_shap}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
