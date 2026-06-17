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
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5 border-b border-[#0D2222] last:border-0">
      <span className="w-full sm:w-36 shrink-0 text-sm font-medium text-white">{label}</span>
      <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
        <div className="flex-1 bg-[#0D2222] rounded h-2 overflow-hidden min-w-0">
          <div
            className="h-full rounded transition-all duration-300"
            style={{ width: `${width}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-14 text-right text-[15px] font-bold shrink-0" style={{ color }}>
          {pct}%
        </span>
      </div>
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
        {String(error)}. Train the models from the Dashboard first.
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
      ? `Inclusion-gap applicants default at ${(gapRate * 100).toFixed(1)}%. That is close to the ${(acceptRate * 100).toFixed(1)}% rate for agreed accepts. The traditional model may be turning away many creditworthy applicants.`
      : gapRate < rejectRate
        ? `Inclusion-gap applicants default at ${(gapRate * 100).toFixed(1)}%. Agreed accepts default at ${(acceptRate * 100).toFixed(1)}%. Agreed rejects default at ${(rejectRate * 100).toFixed(1)}%. The gap group sits between the two. The traditional model flags real risk in part of this group, but not all of it.`
        : `Inclusion-gap applicants default at ${(gapRate * 100).toFixed(1)}%. That matches or exceeds the ${(rejectRate * 100).toFixed(1)}% rate for agreed rejects. The traditional model is right to treat this group as high risk.`

  const riskDivRate = data.risk_divergence_profile?.actual_default_rate
  const riskDivText =
    riskDivRate != null && gapRate != null && riskDivRate < gapRate
      ? `That is below the ${(gapRate * 100).toFixed(1)}% default rate in the inclusion-gap group. The alternative model looks strict on this segment.`
      : `That is above the ${(gapRate * 100).toFixed(1)}% default rate in the inclusion-gap group. The alternative model’s caution is supported by outcomes.`

  return (
    <div className="page-container space-y-6 md:space-y-8">
      <header className="border-b border-[#1A3D3D] pb-5 mb-6 md:mb-8">
        <h2 className="page-title">Inclusion gap analysis</h2>
        <p className="text-[13px] text-[#8BAAAA] mt-1">
          Where the traditional (bureau-based) and alternative (non-bureau) scorecards disagree.
          Holdout set: {data.n_holdout.toLocaleString()} applicants.
        </p>
      </header>

      {/* Section 1 — Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
        <div className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-5 sm:p-6 flex flex-col min-h-[320px]">
          <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-4">
            Population split
          </h3>
          <GapDonut
            distribution={data.gap_distribution}
            distributionPct={data.gap_distribution_pct}
          />
        </div>

        <div
          className="rounded-xl p-6 sm:p-8 flex flex-col justify-center border border-[rgba(251,191,36,0.3)] min-h-[280px]"
          style={{
            background: 'linear-gradient(to bottom right, #1A1A00, #2A2200)',
          }}
        >
          <p className="text-[11px] uppercase tracking-widest text-[#FBBF24] font-medium mb-3">
            Inclusion Gap
          </p>
          <p className="text-[48px] sm:text-[60px] lg:text-[72px] font-extrabold text-[#FBBF24] leading-none mb-2">
            {gapPct}%
          </p>
          <p className="text-lg font-medium text-white mb-3">
            of applicants fall in the inclusion gap
          </p>
          <p className="text-[13px] text-slate-300 leading-relaxed">
            The traditional scorecard rejects or refers them. The alternative scorecard accepts
            them using non-bureau features only. In this holdout, that applies to{' '}
            {data.gap_distribution.inclusion_gap.toLocaleString()} applicants.
          </p>
          <div className="w-12 h-0.5 bg-[#FBBF24] mt-5" />
        </div>
      </div>

      {/* Section 2 — Default Rates */}
      <div className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-6">
        <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-5">
          Default rates by agreement group (real outcomes)
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
          Population profiles
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <ProfileCard
            title="Inclusion gap"
            subtitle="Traditional rejects/refers · Alternative accepts"
            profile={data.inclusion_gap_profile}
            variant="gap"
            defaultRateNote={`vs ${(acceptRate * 100).toFixed(1)}% for agreed accepts and ${(rejectRate * 100).toFixed(1)}% for agreed rejects`}
          />
          <ProfileCard
            title="Agreed reject"
            subtitle="Both scorecards reject"
            profile={data.agreed_reject_profile}
            variant="reject"
            defaultRateNote="Both models reject this group. Actual defaults are high."
          />
        </div>
      </div>

      {/* Section 4 — Risk Divergence */}
      {data.risk_divergence_profile && (
        <div className="bg-[#112B2B] border border-[rgba(167,139,250,0.2)] border-l-[3px] border-l-[#A78BFA] rounded-xl p-6">
          <h4 className="font-bold text-[15px] text-white flex items-center gap-2 mb-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#A78BFA]" />
            The mirror image: risk divergence
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {data.risk_divergence_profile.count.toLocaleString()} applicants pass bureau checks
            but fail the alternative scorecard. Actual default rate:{' '}
            <strong className="text-[#A78BFA]">
              {(data.risk_divergence_profile.actual_default_rate * 100).toFixed(1)}%
            </strong>
            . {riskDivText}
          </p>
        </div>
      )}

      {/* Section 5 — Cost of Exclusion */}
      <div className="bg-[#091A1A] border border-[#1A3D3D] rounded-xl p-5 sm:p-8">
        <p className="text-[11px] uppercase tracking-widest text-[#FBBF24] font-medium mb-2">
          The cost of exclusion
        </p>
        <h3 className="text-lg font-semibold text-white mb-7">
          Illustrative scale of the inclusion gap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1A3D3D]">
          <div className="px-0 md:px-6 pb-6 md:pb-0 first:md:pl-0">
            <p className="text-[28px] sm:text-[36px] lg:text-[40px] font-extrabold text-white leading-tight">
              {cost.inclusion_gap_count.toLocaleString()}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              potentially creditworthy applicants excluded in this holdout sample
            </p>
          </div>
          <div className="px-0 md:px-6 py-6 md:py-0">
            <p className="text-[28px] sm:text-[36px] lg:text-[40px] font-extrabold text-[#FBBF24] leading-tight">
              {formatBillions(cost.avg_credit_requested)}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              average credit requested by this group
            </p>
          </div>
          <div className="px-0 md:px-6 pt-6 md:pt-0 last:md:pr-0">
            <p className="text-[28px] sm:text-[36px] lg:text-[40px] font-extrabold text-[#FBBF24] leading-tight">
              {formatBillions(cost.total_missed_lending)}
            </p>
            <p className="text-[13px] text-[#8BAAAA] mt-2 leading-snug">
              in loans not issued to potentially creditworthy borrowers
            </p>
          </div>
        </div>
        <p className="text-xs text-[#5A8080] italic leading-relaxed border-t border-[#1A3D3D] pt-4 mt-6">
          Illustrative only: gap count × average credit requested on the holdout set. This is not a
          market estimate. It does not subtract expected losses on the{' '}
          {(gapRate * 100).toFixed(1)}% who would default, and it ignores partial approvals and
          pricing.
        </p>
      </div>

      {/* Section 6 — Methodology Note */}
      <div className="bg-[#0D2222] border border-[#1A3D3D] border-l-[3px] border-l-[#00CDB7] rounded-xl px-6 py-5">
        <h3 className="text-[11px] uppercase tracking-wide text-[#00CDB7] font-medium mb-2">
          Methodology note
        </h3>
        <p className="text-[13px] text-slate-300 leading-[1.8]">
          The alternative scorecard uses behavioural and demographic inputs only. No bureau pull.
          Production systems would add mobile money, airtime, utilities, and rent payments. Those
          fields are not in the Home Credit dataset, so this demo uses the non-bureau columns that
          are available. Treat the gap size as a lower bound. Real alternative data would likely
          widen it.
        </p>
      </div>
    </div>
  )
}
