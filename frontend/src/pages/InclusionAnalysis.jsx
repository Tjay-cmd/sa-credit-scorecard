import { useEffect, useState } from 'react'
import { getInclusionAnalysis } from '../api/client.js'
import GapDonut, { GAP_META } from '../components/GapDonut.jsx'
import ProfileCard from '../components/ProfileCard.jsx'

const formatBillions = (v) => {
  if (v >= 1e9) return `R${(v / 1e9).toFixed(2)} billion`
  if (v >= 1e6) return `R${(v / 1e6).toFixed(1)} million`
  return `R${Math.round(v).toLocaleString('en-ZA')}`
}

function DefaultRateRow({ label, rate, color, maxRate }) {
  const pct = (rate * 100).toFixed(1)
  const width = Math.min((rate / maxRate) * 100, 100)

  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-[#0D2222] last:border-0">
      <span className="w-40 shrink-0 text-sm font-medium text-white">{label}</span>
      <div className="flex-1 bg-[#0D2222] rounded h-2 overflow-hidden">
        <div
          className="h-full rounded transition-all duration-300"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-14 text-right text-[15px] font-bold shrink-0" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
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
    return <div className="text-[#8BAAAA] text-sm py-12 text-center">Loading…</div>
  }
  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl px-4 py-3 text-sm">
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

  const interpretationText =
    gapRate <= acceptRate * 1.25
      ? `The inclusion-gap population defaults at ${(gapRate * 100).toFixed(1)}% — close to the agreed-accept group, suggesting the traditional model excludes largely creditworthy people.`
      : gapRate < rejectRate
        ? `The inclusion-gap population defaults at ${(gapRate * 100).toFixed(1)}% — ${(gapRate / acceptRate).toFixed(1)}× the agreed-accept rate, but well below the ${(rejectRate * 100).toFixed(1)}% of agreed rejects — the traditional model is partially, not entirely, right about this group.`
        : `The inclusion-gap population defaults at ${(gapRate * 100).toFixed(1)}% — at or above the agreed-reject rate — the traditional model is right to flag this group.`

  const riskDivRate = data.risk_divergence_profile?.actual_default_rate
  const riskDivText =
    riskDivRate != null && gapRate != null && riskDivRate < gapRate
      ? 'lower than the inclusion-gap group, meaning the alternative model is overly harsh on them. No single model has a monopoly on the truth.'
      : 'higher than the inclusion-gap group, supporting the alternative model’s caution.'

  return (
    <div className="max-w-7xl space-y-8">
      <header className="border-b border-[#1A3D3D] pb-5 mb-8">
        <h2 className="text-[22px] font-semibold text-white">Inclusion Gap Analysis</h2>
        <p className="text-[13px] text-[#8BAAAA] mt-1">
          Where the Traditional (bureau-based) and Alternative (non-bureau) scorecards diverge —{' '}
          {data.n_holdout.toLocaleString()}-applicant holdout set
        </p>
      </header>

      {/* Section 1 — Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-6">
          <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-4">
            Population Split
          </h3>
          <GapDonut
            distribution={data.gap_distribution}
            distributionPct={data.gap_distribution_pct}
          />
        </div>

        <div
          className="rounded-xl p-8 flex flex-col justify-center border border-[rgba(251,191,36,0.3)]"
          style={{
            background: 'linear-gradient(to bottom right, #1A1A00, #2A2200)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-[#FBBF24] font-medium mb-3">
            Inclusion Gap
          </p>
          <p className="text-[72px] font-extrabold text-[#FBBF24] leading-none mb-2">
            {gapPct}%
          </p>
          <p className="text-lg font-medium text-white mb-3">
            of applicants fall in the inclusion gap
          </p>
          <p className="text-[13px] text-slate-300 leading-relaxed">
            Rejected or referred by traditional bureau-based scoring, but accepted by a model using
            only alternative (non-bureau) data —{' '}
            {data.gap_distribution.inclusion_gap.toLocaleString()} people in this holdout sample
            alone.
          </p>
          <div className="w-12 h-0.5 bg-[#FBBF24] mt-5" />
        </div>
      </div>

      {/* Section 2 — Default Rates */}
      <div className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-6">
        <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-5">
          Default Rates by Agreement Group (Real Outcomes)
        </h3>
        <DefaultRateRow
          label={GAP_META.agreed_accept.label}
          rate={acceptRate}
          color="#00CDB7"
          maxRate={rejectRate}
        />
        <DefaultRateRow
          label={GAP_META.inclusion_gap.label}
          rate={gapRate}
          color="#FBBF24"
          maxRate={rejectRate}
        />
        <DefaultRateRow
          label={GAP_META.agreed_reject.label}
          rate={rejectRate}
          color="#EF4444"
          maxRate={rejectRate}
        />
        <div className="bg-[#0D2222] rounded-lg px-4 py-3.5 mt-4 border-l-[3px] border-l-[#FBBF24]">
          <p className="text-[13px] text-slate-300 leading-relaxed">{interpretationText}</p>
        </div>
      </div>

      {/* Section 3 — Profile Cards */}
      <div>
        <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-4">
          Population Profiles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileCard
            title="Inclusion Gap"
            subtitle="Traditional rejects/refers · Alternative accepts"
            profile={data.inclusion_gap_profile}
            variant="gap"
            defaultRateNote={`vs ${(acceptRate * 100).toFixed(1)}% for agreed accepts and ${(rejectRate * 100).toFixed(1)}% for agreed rejects`}
          />
          <ProfileCard
            title="Agreed Reject"
            subtitle="Both scorecards reject"
            profile={data.agreed_reject_profile}
            variant="reject"
            defaultRateNote="Both models agree this group is high risk — and the real outcomes confirm it"
          />
        </div>
      </div>

      {/* Section 4 — Risk Divergence */}
      {data.risk_divergence_profile && (
        <div className="bg-[#112B2B] border border-[rgba(167,139,250,0.2)] border-l-[3px] border-l-[#A78BFA] rounded-xl p-6">
          <h4 className="font-bold text-[15px] text-white flex items-center gap-2 mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
            The Mirror Image: Risk Divergence
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {data.risk_divergence_profile.count.toLocaleString()} applicants pass bureau checks but
            are rejected by the alternative model. Their actual default rate is{' '}
            <strong className="text-[#A78BFA]">
              {(data.risk_divergence_profile.actual_default_rate * 100).toFixed(1)}% actual default
              rate
            </strong>{' '}
            — {riskDivText}
          </p>
        </div>
      )}

      {/* Section 5 — Cost of Exclusion */}
      <div className="bg-[#091A1A] border border-[#1A3D3D] rounded-xl p-8">
        <p className="text-[11px] uppercase tracking-widest text-[#FBBF24] font-medium mb-2">
          The Cost of Exclusion
        </p>
        <h3 className="text-lg font-semibold text-white mb-7">
          Illustrative scale of the inclusion gap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1A3D3D]">
          <div className="px-0 md:px-6 pb-6 md:pb-0 first:md:pl-0">
            <p className="text-[40px] font-extrabold text-white leading-tight">
              {cost.inclusion_gap_count.toLocaleString()}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              potentially creditworthy applicants excluded in this holdout sample
            </p>
          </div>
          <div className="px-0 md:px-6 py-6 md:py-0">
            <p className="text-[40px] font-extrabold text-[#FBBF24] leading-tight">
              {formatBillions(cost.avg_credit_requested)}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              average credit requested by this group
            </p>
          </div>
          <div className="px-0 md:px-6 pt-6 md:pt-0 last:md:pr-0">
            <p className="text-[40px] font-extrabold text-[#FBBF24] leading-tight">
              {formatBillions(cost.total_missed_lending)}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              in loans not issued to potentially creditworthy borrowers
            </p>
          </div>
        </div>
        <p className="text-xs text-[#5A8080] italic leading-relaxed border-t border-[#1A3D3D] pt-4 mt-6">
          Illustrative calculation only (gap count × average credit requested on the holdout set) —
          not a real market estimate. It ignores credit losses on the{' '}
          {(gapRate * 100).toFixed(1)}% of this group that would default, partial approvals, and
          pricing effects.
        </p>
      </div>

      {/* Section 6 — Methodology Note */}
      <div className="bg-[#0D2222] border border-[#1A3D3D] border-l-[3px] border-l-[#00CDB7] rounded-xl px-6 py-5">
        <h3 className="text-[11px] uppercase tracking-wide text-[#00CDB7] font-medium mb-2">
          Methodology Note
        </h3>
        <p className="text-[13px] text-slate-300 leading-[1.8]">
          The alternative scorecard uses only behavioural and demographic features available without
          a credit bureau inquiry. In practice, alternative data sources would include mobile money
          transaction history, airtime spend patterns, utility payment records, and rental payment
          data — none of which are available in the Home Credit dataset. This analysis uses the
          non-bureau features in the existing dataset as a proxy to demonstrate the methodology. The
          gap identified here is directionally correct but would be larger with genuine alternative
          data.
        </p>
      </div>
    </div>
  )
}
