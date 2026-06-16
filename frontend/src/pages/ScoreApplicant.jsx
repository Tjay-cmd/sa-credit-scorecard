import { useState } from 'react'
import { scoreApplicant } from '../api/client.js'
import ContributionChart from '../components/ContributionChart.jsx'

const INCOME_TYPES = [
  'Working', 'State servant', 'Commercial associate', 'Pensioner',
  'Unemployed', 'Student', 'Businessman', 'Maternity leave',
]
const EDUCATION_TYPES = [
  'Secondary / secondary special', 'Higher education',
  'Incomplete higher', 'Lower secondary', 'Academic degree',
]
const FAMILY_STATUSES = [
  'Single / not married', 'Married', 'Civil marriage', 'Widow', 'Separated',
]

const DEFAULT_FORM = {
  AMT_INCOME_TOTAL: 180000,
  AMT_CREDIT: 500000,
  AMT_ANNUITY: 25000,
  AGE_YEARS: 40,
  YEARS_EMPLOYED: 8,
  CNT_FAM_MEMBERS: 2,
  NAME_INCOME_TYPE: 'Working',
  NAME_EDUCATION_TYPE: 'Higher education',
  NAME_FAMILY_STATUS: 'Married',
  REGION_RATING_CLIENT: 2,
  EXT_SOURCE_1: '',
  EXT_SOURCE_2: 0.65,
  EXT_SOURCE_3: 0.55,
  CODE_GENDER: 'F',
  FLAG_OWN_CAR: 'Y',
  FLAG_OWN_REALTY: 'Y',
}

const SCORE_COLORS = {
  accept: 'text-[#00CDB7]',
  refer: 'text-[#FBBF24]',
  reject: 'text-[#EF4444]',
}

const BADGE_STYLES = {
  accept: 'bg-[rgba(0,205,183,0.1)] text-[#00CDB7] border border-teal-800',
  refer: 'bg-[rgba(251,191,36,0.1)] text-[#FBBF24] border border-amber-800/40',
  reject: 'bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-red-800/40',
}

const GAP_BANNERS = {
  inclusion_gap: {
    cls: 'bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.3)]',
    titleCls: 'text-[#FBBF24]',
    title: 'Inclusion Gap Detected',
    text: 'This applicant is rejected by the traditional bureau-based model but accepted by the alternative data model. They may represent an underserved creditworthy segment.',
    icon: '⚠',
  },
  risk_divergence: {
    cls: 'bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.3)]',
    titleCls: 'text-[#A78BFA]',
    title: 'Risk Divergence',
    text: 'This applicant passes bureau checks but alternative indicators suggest elevated risk.',
    icon: '↔',
  },
  refer_overlap: {
    cls: 'bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.25)]',
    titleCls: 'text-slate-300',
    title: 'Refer Overlap',
    text: 'The two scorecards partially disagree — at least one refers this applicant for manual review.',
    icon: '◎',
  },
  agreed_accept: {
    cls: 'bg-[rgba(0,205,183,0.08)] border-[rgba(0,205,183,0.3)]',
    titleCls: 'text-[#00CDB7]',
    title: 'Agreed Accept',
    text: 'Both models agree: accept.',
    icon: '✓',
  },
  agreed_reject: {
    cls: 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.3)]',
    titleCls: 'text-[#EF4444]',
    title: 'Agreed Reject',
    text: 'Both models agree: reject.',
    icon: '✕',
  },
}

function ScorePanel({ result, variant }) {
  const labelCls = variant === 'alternative' ? 'text-[#A78BFA]' : 'text-[#5A8080]'
  const labelText = variant === 'alternative' ? 'Alternative' : 'Traditional'

  return (
    <div className="bg-[#0D2222] border border-[#1A3D3D] rounded-xl p-5 flex-1 min-w-0">
      <p className={`text-[11px] uppercase tracking-wide font-medium mb-2 ${labelCls}`}>
        {labelText}
      </p>
      <p className={`text-[48px] font-bold leading-none ${SCORE_COLORS[result.decision]}`}>
        {result.score}
      </p>
      <span
        className={`inline-block mt-3 rounded-full px-3 py-1 text-xs font-semibold border ${
          BADGE_STYLES[result.decision] ?? ''
        }`}
      >
        {result.decision.toUpperCase()}
      </span>
      <p className="text-[11px] text-[#5A8080] mt-3">
        Base {result.base_score} {result.raw_score - result.base_score >= 0 ? '+' : '−'}{' '}
        {Math.abs(result.raw_score - result.base_score).toFixed(1)} pts · PD{' '}
        {(result.probability_of_default * 100).toFixed(1)}%
      </p>
      <p className="text-[11px] text-[#5A8080] mt-0.5">
        ≥{result.thresholds.accept} accept · ≥{result.thresholds.refer} refer
      </p>
    </div>
  )
}

function GapBanner({ gapClass }) {
  const banner = GAP_BANNERS[gapClass]
  if (!banner) return null

  return (
    <div className={`rounded-lg border px-4 py-3.5 ${banner.cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${banner.titleCls}`}>{banner.icon}</span>
          <p className={`text-[13px] font-bold ${banner.titleCls}`}>{banner.title}</p>
        </div>
        {gapClass === 'inclusion_gap' && (
          <span
            className="text-[#5A8080] text-xs cursor-help shrink-0"
            title="Inclusion gap: traditional model excludes, alternative model accepts"
          >
            ?
          </span>
        )}
      </div>
      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{banner.text}</p>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="mb-4">
      <h3 className="text-[11px] uppercase tracking-[0.1em] text-[#5A8080] font-medium">
        {title}
      </h3>
      <div className="h-px bg-[#1A3D3D] mt-2" />
    </div>
  )
}

function Field({ label, children, hint, fullWidth = false }) {
  return (
    <label className={`block ${fullWidth ? 'col-span-2' : ''}`}>
      <span className="block text-xs font-medium text-[#8BAAAA] mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#5A8080] italic mt-1">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#1A3D3D] bg-[#0D2222] px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-[#3D6666] focus:outline-none focus:border-[#00CDB7] ' +
  'focus:shadow-[0_0_0_2px_rgba(0,205,183,0.15)]'

// '' -> null (optional field), otherwise numeric
const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

function EmptyResults() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] text-center px-6">
      <span className="text-4xl text-[#00CDB7] mb-4">→</span>
      <p className="text-sm text-[#8BAAAA]">
        Complete the form to generate a credit score
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        {['Traditional Score', 'Alternative Score', 'Inclusion Gap Class'].map((pill) => (
          <span
            key={pill}
            className="bg-[#0D2222] border border-[#1A3D3D] text-[#8BAAAA] text-[11px] rounded-full px-2.5 py-1"
          >
            {pill}
          </span>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 border-2 border-[#091A1A]/30 border-t-[#091A1A] rounded-full animate-spin mr-2 align-middle"
      aria-hidden
    />
  )
}

export default function ScoreApplicant() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        AMT_INCOME_TOTAL: Number(form.AMT_INCOME_TOTAL),
        AMT_CREDIT: Number(form.AMT_CREDIT),
        AMT_ANNUITY: Number(form.AMT_ANNUITY),
        AGE_YEARS: Number(form.AGE_YEARS),
        YEARS_EMPLOYED: numOrNull(form.YEARS_EMPLOYED),
        CNT_FAM_MEMBERS: Number(form.CNT_FAM_MEMBERS),
        REGION_RATING_CLIENT: Number(form.REGION_RATING_CLIENT),
        EXT_SOURCE_1: numOrNull(form.EXT_SOURCE_1),
        EXT_SOURCE_2: numOrNull(form.EXT_SOURCE_2),
        EXT_SOURCE_3: numOrNull(form.EXT_SOURCE_3),
      }
      setResult(await scoreApplicant(payload))
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        Array.isArray(detail)
          ? detail.map((d) => `${d.loc?.join('.')}: ${d.msg}`).join('; ')
          : detail ?? err.message,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl">
      <header className="border-b border-[#1A3D3D] pb-5 mb-7">
        <h2 className="text-[22px] font-semibold text-white">Score Applicant</h2>
        <p className="text-[13px] text-[#8BAAAA] mt-1">
          Enter applicant details to generate a credit score, decision, and variable-level
          explanation
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <form onSubmit={handleSubmit} className="w-full lg:w-[45%] shrink-0 space-y-6">
          <div>
            <SectionHeader title="Financial Profile" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Annual income" fullWidth>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={form.AMT_INCOME_TOTAL}
                  onChange={set('AMT_INCOME_TOTAL')}
                  className={inputClass}
                />
              </Field>
              <Field label="Credit amount">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={form.AMT_CREDIT}
                  onChange={set('AMT_CREDIT')}
                  className={inputClass}
                />
              </Field>
              <Field label="Loan annuity">
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={form.AMT_ANNUITY}
                  onChange={set('AMT_ANNUITY')}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div>
            <SectionHeader title="Personal Profile" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Age (years)">
                <input
                  type="number"
                  min="18"
                  max="100"
                  step="0.5"
                  required
                  value={form.AGE_YEARS}
                  onChange={set('AGE_YEARS')}
                  className={inputClass}
                />
              </Field>
              <Field label="Years employed" hint="Blank = not working / pensioner">
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  value={form.YEARS_EMPLOYED}
                  onChange={set('YEARS_EMPLOYED')}
                  className={inputClass}
                />
              </Field>
              <Field label="Family members">
                <input
                  type="number"
                  min="1"
                  max="25"
                  required
                  value={form.CNT_FAM_MEMBERS}
                  onChange={set('CNT_FAM_MEMBERS')}
                  className={inputClass}
                />
              </Field>
              <Field label="Gender">
                <select value={form.CODE_GENDER} onChange={set('CODE_GENDER')} className={inputClass}>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </Field>
              <Field label="Family status">
                <select
                  value={form.NAME_FAMILY_STATUS}
                  onChange={set('NAME_FAMILY_STATUS')}
                  className={inputClass}
                >
                  {FAMILY_STATUSES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Owns car">
                <select value={form.FLAG_OWN_CAR} onChange={set('FLAG_OWN_CAR')} className={inputClass}>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
              </Field>
              <Field label="Owns realty">
                <select
                  value={form.FLAG_OWN_REALTY}
                  onChange={set('FLAG_OWN_REALTY')}
                  className={inputClass}
                >
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
              </Field>
            </div>
          </div>

          <div>
            <SectionHeader title="Bureau Scores" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Ext. source 1 (0–1)" hint="Optional">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.EXT_SOURCE_1}
                  onChange={set('EXT_SOURCE_1')}
                  className={inputClass}
                />
              </Field>
              <Field label="Ext. source 2 (0–1)" hint="Optional">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.EXT_SOURCE_2}
                  onChange={set('EXT_SOURCE_2')}
                  className={inputClass}
                />
              </Field>
              <Field label="Ext. source 3 (0–1)" hint="Optional">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.EXT_SOURCE_3}
                  onChange={set('EXT_SOURCE_3')}
                  className={inputClass}
                />
              </Field>
              <Field label="Region rating" hint="1 = best, 3 = worst">
                <select
                  value={form.REGION_RATING_CLIENT}
                  onChange={set('REGION_RATING_CLIENT')}
                  className={inputClass}
                >
                  {[1, 2, 3].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Education">
                <select
                  value={form.NAME_EDUCATION_TYPE}
                  onChange={set('NAME_EDUCATION_TYPE')}
                  className={inputClass}
                >
                  {EDUCATION_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Income type">
                <select
                  value={form.NAME_INCOME_TYPE}
                  onChange={set('NAME_INCOME_TYPE')}
                  className={inputClass}
                >
                  {INCOME_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-6 rounded-lg bg-[#00CDB7] text-[#091A1A] font-bold text-sm
                       hover:bg-[#00A896] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Spinner />
                Scoring...
              </>
            ) : (
              'Score Applicant'
            )}
          </button>

          {error && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg px-3 py-2 text-xs">
              {String(error)}
            </div>
          )}
        </form>

        <div className="w-full lg:w-[55%] min-w-0">
          {!result && <EmptyResults />}

          {result && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <ScorePanel result={result.traditional} variant="traditional" />
                <ScorePanel result={result.alternative} variant="alternative" />
              </div>

              <GapBanner gapClass={result.inclusion_gap_class} />

              <div className="space-y-5">
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-3">
                    Traditional Contributions
                  </h3>
                  <ContributionChart
                    contributions={result.traditional.contributions}
                    positiveColor="#00CDB7"
                    dark
                  />
                </div>
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-[#5A8080] font-medium mb-3">
                    Alternative Contributions
                  </h3>
                  <ContributionChart
                    contributions={result.alternative.contributions}
                    positiveColor="#A78BFA"
                    dark
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
