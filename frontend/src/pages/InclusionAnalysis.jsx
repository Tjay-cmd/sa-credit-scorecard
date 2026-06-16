import { useEffect, useState } from 'react'
import { getInclusionAnalysis } from '../api/client.js'
import GapDonut, { GAP_META } from '../components/GapDonut.jsx'
import ProfileCard from '../components/ProfileCard.jsx'

const formatBillions = (v) => {
  if (v >= 1e9) return `R${(v / 1e9).toFixed(2)} billion`
  if (v >= 1e6) return `R${(v / 1e6).toFixed(1) } million`
  return `R${Math.round(v).toLocaleString('en-ZA')}`
}

export default function InclusionAnalysis() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInclusionAnalysis()
      .then(setData)
      .catch((e) => setError(e.response?.data?.detail ?? e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
        {String(error)} — train the models from the Dashboard first.
      </div>
    )
  }

  const gapPct = data.gap_distribution_pct.inclusion_gap
  const gapProfile = data.inclusion_gap_profile
  const benchmarks = data.benchmarks
  const cost = data.cost_of_exclusion

  const gapRate = gapProfile ? gapProfile.actual_default_rate : null
  const acceptRate = benchmarks.agreed_accept_default_rate
  const rejectRate = benchmarks.agreed_reject_default_rate

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Inclusion Gap Analysis</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Where the Traditional (bureau-based) and Alternative (non-bureau) scorecards
          diverge on the {data.n_holdout.toLocaleString()}-applicant holdout set.
        </p>
      </div>

      {/* Section 1 — Gap Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-2">Population Split</h3>
          <GapDonut
            distribution={data.gap_distribution}
            distributionPct={data.gap_distribution_pct}
          />
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex-1 flex flex-col justify-center">
            <p className="text-5xl font-extrabold text-amber-600">{gapPct}%</p>
            <p className="text-base font-semibold text-amber-900 mt-2">
              of applicants fall in the inclusion gap
            </p>
            <p className="text-sm text-amber-800/80 mt-1">
              Rejected or referred by traditional bureau-based scoring, but accepted by a
              model using only alternative (non-bureau) data —{' '}
              {data.gap_distribution.inclusion_gap.toLocaleString()} people in this holdout
              sample alone.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Default rates by agreement group (real outcomes)
            </p>
            <div className="space-y-2">
              {[
                { label: GAP_META.agreed_accept.label, rate: acceptRate, color: GAP_META.agreed_accept.color },
                { label: GAP_META.inclusion_gap.label, rate: gapRate, color: GAP_META.inclusion_gap.color },
                { label: GAP_META.agreed_reject.label, rate: rejectRate, color: GAP_META.agreed_reject.color },
              ].map(({ label, rate, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className="w-32 text-slate-600 text-xs">{label}</span>
                  <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${Math.min(rate * 100 * 4, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono font-semibold text-slate-800 text-xs">
                    {(rate * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              The inclusion-gap population defaults at {(gapRate * 100).toFixed(1)}% —{' '}
              {gapRate <= acceptRate * 1.25
                ? 'close to the agreed-accept group, suggesting the traditional model excludes largely creditworthy people.'
                : gapRate < rejectRate
                  ? `${(gapRate / acceptRate).toFixed(1)}× the agreed-accept rate, but well below the ${(rejectRate * 100).toFixed(1)}% of agreed rejects — the traditional model is partially, not entirely, right about this group.`
                  : 'at or above the agreed-reject rate — the traditional model is right to flag this group.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2 — Who Is Being Excluded? */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Who Is Being Excluded?</h3>
        <p className="text-sm text-slate-500 mb-4">
          Profile of the inclusion-gap population vs the applicants both models reject.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileCard
            title="Inclusion Gap"
            subtitle="Traditional rejects/refers · Alternative accepts"
            profile={data.inclusion_gap_profile}
            color={GAP_META.inclusion_gap.color}
            defaultRateNote={`vs ${(acceptRate * 100).toFixed(1)}% for agreed accepts and ${(rejectRate * 100).toFixed(1)}% for agreed rejects`}
          />
          <ProfileCard
            title="Agreed Reject"
            subtitle="Both scorecards reject"
            profile={data.agreed_reject_profile}
            color={GAP_META.agreed_reject.color}
            defaultRateNote="Both models agree this group is high risk — and the real outcomes confirm it"
          />
        </div>
        {data.risk_divergence_profile && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
              The mirror image: Risk Divergence
            </h4>
            <p className="text-sm text-slate-600 mt-1">
              {data.risk_divergence_profile.count.toLocaleString()} applicants pass bureau
              checks but are rejected by the alternative model. Their actual default rate is{' '}
              <strong>{(data.risk_divergence_profile.actual_default_rate * 100).toFixed(1)}%</strong>{' '}
              — {data.risk_divergence_profile.actual_default_rate < gapRate
                ? 'lower than the inclusion-gap group, meaning the alternative model is overly harsh on them. No single model has a monopoly on the truth.'
                : 'higher than the inclusion-gap group, supporting the alternative model’s caution.'}
            </p>
          </div>
        )}
      </div>

      {/* Section 3 — The Cost of Exclusion */}
      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4">The Cost of Exclusion</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-3xl font-extrabold text-amber-400">
              {cost.inclusion_gap_count.toLocaleString()}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              potentially creditworthy applicants excluded in this holdout sample
            </p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">
              {formatBillions(cost.avg_credit_requested)}
            </p>
            <p className="text-sm text-slate-300 mt-1">average credit requested by this group</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">
              {formatBillions(cost.total_missed_lending)}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              in loans not issued to potentially creditworthy borrowers
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 border-t border-slate-700 pt-3">
          Illustrative calculation only (gap count × average credit requested on the holdout
          set) — not a real market estimate. It ignores credit losses on the{' '}
          {(gapRate * 100).toFixed(1)}% of this group that would default, partial approvals,
          and pricing effects.
        </p>
      </div>

      {/* Section 4 — Methodology Note */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-2">Methodology Note</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          The alternative scorecard uses only behavioural and demographic features available
          without a credit bureau inquiry. In practice, alternative data sources would include
          mobile money transaction history, airtime spend patterns, utility payment records,
          and rental payment data — none of which are available in the Home Credit dataset.
          This analysis uses the non-bureau features in the existing dataset as a proxy to
          demonstrate the methodology. The gap identified here is directionally correct but
          would be larger with genuine alternative data.
        </p>
      </div>
    </div>
  )
}
