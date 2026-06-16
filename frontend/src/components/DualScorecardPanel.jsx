const SCORECARD_METRICS = [
  { key: 'auc', label: 'AUC (holdout)', fmt: (v) => v.toFixed(3) },
  { key: 'gini', label: 'Gini', fmt: (v) => v.toFixed(3) },
  { key: 'ks', label: 'KS statistic', fmt: (v) => v.toFixed(3) },
  { key: 'train_auc', label: 'AUC (train)', fmt: (v) => v.toFixed(3) },
  { key: 'mean_score', label: 'Mean score', fmt: (v) => Math.round(v), scorecardOnly: true },
]

const COLUMNS = [
  { key: 'traditional', label: 'Traditional', className: 'text-sky-700' },
  { key: 'alternative', label: 'Alternative', className: 'text-violet-700' },
  { key: 'xgboost_benchmark', label: 'XGBoost', className: 'text-amber-700', benchmark: true },
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-1">Model Comparison</h3>
      <p className="text-xs text-slate-500 mb-4">
        Traditional and Alternative are production WOE scorecards. XGBoost is a
        discrimination benchmark on the same features — not used for decisions.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Metric</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`py-2 pr-4 font-medium text-right ${col.className}`}
                >
                  {col.label}
                  {col.benchmark && (
                    <span className="block font-normal text-[10px] text-slate-400">benchmark</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCORECARD_METRICS.map((metric) => (
              <tr key={metric.key} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-600">{metric.label}</td>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="py-2 pr-4 text-right font-mono font-semibold text-slate-800"
                  >
                    {cellValue(models[col.key], metric)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-slate-100">
              <td className="py-2 pr-4 text-slate-600">Cutoffs (accept / refer)</td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2 pr-4 text-right font-mono font-semibold text-slate-800">
                  {col.benchmark || !models[col.key]?.thresholds
                    ? '—'
                    : `${models[col.key].thresholds.accept} / ${models[col.key].thresholds.refer}`}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-slate-600">Decision mix (A / R / X)</td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2 pr-4 text-right font-mono text-xs text-slate-700">
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
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600 mb-2">
            XGBoost — top features by mean |SHAP| (holdout subsample)
          </p>
          <div className="flex flex-wrap gap-2">
            {xgboostBenchmark.shap_importance.slice(0, 8).map((item) => (
              <span
                key={item.feature}
                className="text-[11px] font-mono bg-amber-50 text-amber-900 border border-amber-200 rounded px-2 py-0.5"
              >
                {item.feature} <span className="text-amber-600">{item.mean_abs_shap}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
