import { useCallback, useEffect, useState } from 'react'
import { getHealth, getModelStats, trainModel } from '../api/client.js'
import DualScorecardPanel from '../components/DualScorecardPanel.jsx'
import RocChart from '../components/RocChart.jsx'
import ScoreDistributionChart from '../components/ScoreDistributionChart.jsx'

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function DistributionCard({ model, accentClass }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h3 className={`font-semibold ${accentClass}`}>{model.label}</h3>
        <div className="flex gap-2 text-[11px] text-slate-500">
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1" />≥{model.thresholds.accept}</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1" />{model.thresholds.refer}–{model.thresholds.accept - 1}</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" />&lt;{model.thresholds.refer}</span>
        </div>
      </div>
      <ScoreDistributionChart distribution={model.score_distribution} />
      <div className="flex justify-around mt-3 text-center text-sm">
        <div>
          <p className="font-bold text-emerald-600">
            {model.decision_mix.accept.toLocaleString()}
            <span className="font-normal text-slate-400"> · {model.decision_mix_pct.accept}%</span>
          </p>
          <p className="text-xs text-slate-500">Accepted</p>
        </div>
        <div>
          <p className="font-bold text-amber-600">
            {model.decision_mix.refer.toLocaleString()}
            <span className="font-normal text-slate-400"> · {model.decision_mix_pct.refer}%</span>
          </p>
          <p className="text-xs text-slate-500">Referred</p>
        </div>
        <div>
          <p className="font-bold text-red-600">
            {model.decision_mix.reject.toLocaleString()}
            <span className="font-normal text-slate-400"> · {model.decision_mix_pct.reject}%</span>
          </p>
          <p className="text-xs text-slate-500">Rejected</p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [training, setTraining] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const h = await getHealth()
      setHealth(h)
      if (h.model_trained) {
        setStats(await getModelStats())
      } else {
        setStats(null)
      }
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleTrain = async () => {
    setTraining(true)
    setError(null)
    try {
      await trainModel()
      await load()
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message)
    } finally {
      setTraining(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Model Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {health?.model_trained ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
                Both scorecards trained · last trained {formatTimestamp(stats?.trained_at ?? health?.trained_at)}
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />
                No model trained yet — train to get started
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm
                     hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors shadow-sm"
        >
          {training ? 'Training…' : health?.model_trained ? 'Retrain Models' : 'Train Models'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {String(error)}
        </div>
      )}

      {loading && (
        <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>
      )}

      {!loading && !stats && !error && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          No model artifacts found. Click <strong>Train Models</strong> to train both the
          Traditional and Alternative scorecards on the Home Credit dataset.
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DualScorecardPanel
              traditional={stats.traditional}
              alternative={stats.alternative}
              xgboostBenchmark={stats.xgboost_benchmark}
            />
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                <h3 className="font-semibold text-slate-800">ROC Curves</h3>
                <p className="text-xs text-slate-500">
                  Traditional <span className="font-bold text-sky-700">{stats.traditional.auc.toFixed(3)}</span>
                  {' · '}
                  Alternative <span className="font-bold text-violet-700">{stats.alternative.auc.toFixed(3)}</span>
                  {stats.xgboost_benchmark && (
                    <>
                      {' · '}
                      XGBoost <span className="font-bold text-amber-700">{stats.xgboost_benchmark.auc.toFixed(3)}</span>
                    </>
                  )}
                </p>
              </div>
              <RocChart
                curves={[
                  { name: 'Traditional', data: stats.traditional.roc_curve, color: '#0284c7' },
                  { name: 'Alternative', data: stats.alternative.roc_curve, color: '#7c3aed' },
                  ...(stats.xgboost_benchmark
                    ? [{ name: 'XGBoost (benchmark)', data: stats.xgboost_benchmark.roc_curve, color: '#d97706' }]
                    : []),
                ]}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-2">Why we still use the scorecard</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Under the <strong>National Credit Act 34 of 2005 (NCA)</strong>, credit providers must
              assess affordability and give consumers a clear basis for credit decisions. Where credit
              is refused or offered on unfavourable terms, consumers have the right to request reasons
              — and those reasons must be understandable, not a black-box probability.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              A WOE scorecard gives each variable an explicit points contribution that sums to the final
              score; every bin is documented in the WOE tables and can be reproduced by hand. XGBoost
              may achieve higher discrimination (see benchmark above), but SHAP values are post-hoc
              approximations — useful for analysis, not a substitute for the auditable, regulator-ready
              point allocation that the NCA&apos;s explainability requirements demand in production.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionCard model={stats.traditional} accentClass="text-sky-700" />
            <DistributionCard model={stats.alternative} accentClass="text-violet-700" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Base score / PDO</p>
                <p className="font-semibold text-slate-800">
                  {stats.scorecard_config.base_score} / {stats.scorecard_config.pdo}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Score range</p>
                <p className="font-semibold text-slate-800">
                  {stats.scorecard_config.score_min}–{stats.scorecard_config.score_max}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Train / test split</p>
                <p className="font-semibold text-slate-800">
                  {stats.n_train.toLocaleString()} / {stats.n_test.toLocaleString()} (stratified)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cutoff calibration</p>
                <p className="font-semibold text-slate-800">
                  Per-model train-score percentiles (p20 / p40)
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Traditional dropped (IV &lt; 0.02)</p>
                <p className="font-semibold text-slate-800 text-xs">
                  {stats.traditional.dropped_features.join(', ') || 'none'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Alternative dropped (IV &lt; 0.02)</p>
                <p className="font-semibold text-slate-800 text-xs">
                  {stats.alternative.dropped_features.join(', ') || 'none'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
