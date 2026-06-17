import { useCallback, useEffect, useState } from 'react'
import { getHealth, getInclusionAnalysis, getModelStats, trainModel } from '../api/client.js'
import DualScorecardPanel from '../components/DualScorecardPanel.jsx'
import RocChart from '../components/RocChart.jsx'
import ScoreDistributionChart from '../components/ScoreDistributionChart.jsx'

const TEAL = '#00CDB7'
const VIOLET = '#A78BFA'
const AMBER = '#FBBF24'

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function StatStripCard({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="bg-[#0D2222] border border-[#1A3D3D] rounded-xl px-4 sm:px-5 py-4 min-w-0">
      <p className="text-xs text-[#8BAAAA] mb-1">{label}</p>
      <p className={`text-[24px] md:text-[28px] font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}

function DistributionCard({ model, accentColor, accentClass }) {
  return (
    <div className="bg-[#112B2B] rounded-xl border border-[#1A3D3D] p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h3
          className={`text-sm font-semibold uppercase tracking-[0.05em] ${accentClass}`}
          style={accentColor ? { color: accentColor } : undefined}
        >
          {model.label}
        </h3>
        <div className="flex gap-2 text-[11px] text-[#8BAAAA]">
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#00CDB7] mr-1" />≥
            {model.thresholds.accept}
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#FBBF24] mr-1" />
            {model.thresholds.refer}–{model.thresholds.accept - 1}
          </span>
          <span>
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#EF4444] mr-1" />&lt;
            {model.thresholds.refer}
          </span>
        </div>
      </div>
      <ScoreDistributionChart distribution={model.score_distribution} />
      <div className="flex justify-around mt-3 text-center text-sm">
        <div>
          <p className="font-bold text-[#00CDB7]">
            {model.decision_mix.accept.toLocaleString()}
            <span className="font-normal text-[#5A8080]"> · {model.decision_mix_pct.accept}%</span>
          </p>
          <p className="text-xs text-[#5A8080]">Accepted</p>
        </div>
        <div>
          <p className="font-bold text-[#FBBF24]">
            {model.decision_mix.refer.toLocaleString()}
            <span className="font-normal text-[#5A8080]"> · {model.decision_mix_pct.refer}%</span>
          </p>
          <p className="text-xs text-[#5A8080]">Referred</p>
        </div>
        <div>
          <p className="font-bold text-[#EF4444]">
            {model.decision_mix.reject.toLocaleString()}
            <span className="font-normal text-[#5A8080]"> · {model.decision_mix_pct.reject}%</span>
          </p>
          <p className="text-xs text-[#5A8080]">Rejected</p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [inclusionGapPct, setInclusionGapPct] = useState(null)
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
        const [modelStats, inclusion] = await Promise.all([
          getModelStats(),
          getInclusionAnalysis(),
        ])
        setStats(modelStats)
        setInclusionGapPct(inclusion?.gap_distribution_pct?.inclusion_gap ?? null)
      } else {
        setStats(null)
        setInclusionGapPct(null)
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
    <div className="space-y-6 page-container">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="page-title">Model dashboard</h2>
          <p className="text-sm text-[#8BAAAA] mt-1">
            {health?.model_trained ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-[#00CDB7] mr-1.5 align-middle" />
                Both scorecards trained · last trained{' '}
                {formatTimestamp(stats?.trained_at ?? health?.trained_at)}
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />
                No model trained yet. Train from the Dashboard to get started.
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="w-full md:w-auto min-h-[44px] px-5 py-2.5 rounded-lg bg-[#00CDB7] text-[#091A1A] font-bold text-sm
                     hover:bg-[#00A896] disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors shrink-0"
        >
          {training ? 'Training…' : health?.model_trained ? 'Retrain Models' : 'Train Models'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 text-sm">
          {String(error)}
        </div>
      )}

      {loading && (
        <div className="text-[#8BAAAA] text-sm py-12 text-center">Loading…</div>
      )}

      {!loading && !stats && !error && (
        <div className="bg-[#112B2B] rounded-xl border border-[#1A3D3D] p-12 text-center text-[#8BAAAA]">
          No model artifacts found. Click{' '}
          <strong className="text-white">Train Models</strong> to train both the Traditional and
          Alternative scorecards on the Home Credit dataset.
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatStripCard
              label="Holdout AUC"
              value={stats.traditional.auc.toFixed(3)}
              valueClass="text-[#00CDB7]"
            />
            <StatStripCard
              label="Gini coefficient"
              value={stats.traditional.gini.toFixed(3)}
              valueClass="text-[#00CDB7]"
            />
            <StatStripCard
              label="Inclusion Gap"
              value={inclusionGapPct != null ? `${inclusionGapPct}%` : '—'}
              valueClass="text-[#FBBF24]"
            />
            <StatStripCard
              label="Training rows"
              value={(stats.n_train + stats.n_test).toLocaleString()}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
            <DualScorecardPanel
              traditional={stats.traditional}
              alternative={stats.alternative}
              xgboostBenchmark={stats.xgboost_benchmark}
            />
            <div className="bg-[#112B2B] rounded-xl border border-[#1A3D3D] p-5 flex flex-col min-h-[420px] lg:min-h-0">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2 shrink-0">
                <h3 className="text-white text-sm font-semibold uppercase tracking-[0.05em]">
                  ROC Curves
                </h3>
                <p className="text-[11px] sm:text-xs text-[#8BAAAA]">
                  Traditional{' '}
                  <span className="font-bold" style={{ color: TEAL }}>
                    {stats.traditional.auc.toFixed(3)}
                  </span>
                  {' · '}
                  Alternative{' '}
                  <span className="font-bold" style={{ color: VIOLET }}>
                    {stats.alternative.auc.toFixed(3)}
                  </span>
                  {stats.xgboost_benchmark && (
                    <>
                      {' · '}
                      XGBoost{' '}
                      <span className="font-bold" style={{ color: AMBER }}>
                        {stats.xgboost_benchmark.auc.toFixed(3)}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <RocChart
                curves={[
                  { name: 'Traditional', data: stats.traditional.roc_curve, color: TEAL },
                  { name: 'Alternative', data: stats.alternative.roc_curve, color: VIOLET },
                  ...(stats.xgboost_benchmark
                    ? [
                        {
                          name: 'XGBoost (benchmark)',
                          data: stats.xgboost_benchmark.roc_curve,
                          color: AMBER,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>

          <div className="bg-[#0D2222] rounded-xl border border-[#1A3D3D] border-l-[3px] border-l-[#00CDB7] p-5">
            <h3 className="text-[#00CDB7] text-sm font-semibold uppercase tracking-[0.05em] mb-3">
              Why we still use the scorecard
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Under the <strong className="text-white">National Credit Act 34 of 2005 (NCA)</strong>,
              credit providers must assess affordability and explain credit decisions. If an
              application is refused or offered on unfavourable terms, the consumer can ask why.
              The answer has to be in plain language, not an opaque model score.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              Each WOE variable adds a fixed number of points. Every bin is in the WOE tables and
              can be checked by hand. The XGBoost benchmark on this dashboard often scores higher
              on AUC. SHAP explains those predictions after the fact. We still ship the scorecard
              because auditors and the NCA need point rules you can trace, not post-hoc feature
              attributions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            <DistributionCard
              model={stats.traditional}
              accentColor={TEAL}
              accentClass="text-[#00CDB7]"
            />
            <DistributionCard
              model={stats.alternative}
              accentColor={VIOLET}
              accentClass="text-[#A78BFA]"
            />
          </div>

          <div className="bg-[#112B2B] rounded-xl border border-[#1A3D3D] p-5">
            <h3 className="text-white text-sm font-semibold uppercase tracking-[0.05em] mb-4">
              Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Base score / PDO
                </p>
                <p className="font-semibold text-white tabular-nums">
                  {stats.scorecard_config.base_score} / {stats.scorecard_config.pdo}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Score range
                </p>
                <p className="font-semibold text-white tabular-nums">
                  {stats.scorecard_config.score_min}–{stats.scorecard_config.score_max}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Train / test split
                </p>
                <p className="font-semibold text-white tabular-nums">
                  {stats.n_train.toLocaleString()} / {stats.n_test.toLocaleString()} (stratified)
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Cutoff calibration
                </p>
                <p className="font-semibold text-white">
                  Per-model train-score percentiles (p20 / p40)
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Traditional dropped (IV &lt; 0.02)
                </p>
                <p className="font-semibold text-slate-300 text-xs">
                  {stats.traditional.dropped_features.join(', ') || 'none'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-widest text-[#8BAAAA] mb-1">
                  Alternative dropped (IV &lt; 0.02)
                </p>
                <p className="font-semibold text-slate-300 text-xs">
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
