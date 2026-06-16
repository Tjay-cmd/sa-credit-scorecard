import { useState } from 'react'
import { scoreApplicant } from '../api/client.js'
import ContributionChart from '../components/ContributionChart.jsx'
import DecisionBadge from '../components/DecisionBadge.jsx'

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
  accept: 'text-emerald-600',
  refer: 'text-amber-600',
  reject: 'text-red-600',
}

const GAP_BANNERS = {
  inclusion_gap: {
    cls: 'bg-amber-50 border-amber-300 text-amber-900',
    title: 'Inclusion Gap',
    text: 'This applicant would be rejected by a traditional bureau-based model but accepted by an alternative data model.',
  },
  risk_divergence: {
    cls: 'bg-red-50 border-red-300 text-red-900',
    title: 'Risk Divergence',
    text: 'This applicant passes bureau checks but alternative indicators suggest elevated risk.',
  },
  refer_overlap: {
    cls: 'bg-slate-50 border-slate-300 text-slate-700',
    title: 'Refer Overlap',
    text: 'The two scorecards partially disagree — at least one refers this applicant for manual review.',
  },
}

function ScorePanel({ result, accentClass }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${accentClass}`}>
            {result.label}
          </p>
          <p className={`text-5xl font-extrabold leading-none mt-1 ${SCORE_COLORS[result.decision]}`}>
            {result.score}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Base {result.base_score} {result.raw_score - result.base_score >= 0 ? '+' : '−'}{' '}
            {Math.abs(result.raw_score - result.base_score).toFixed(1)} pts
            · PD {(result.probability_of_default * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-right space-y-2">
          <DecisionBadge decision={result.decision} />
          <p className="text-[11px] text-slate-400">
            ≥{result.thresholds.accept} accept · ≥{result.thresholds.refer} refer
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  )
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'

// '' -> null (optional field), otherwise numeric
const numOrNull = (v) => (v === '' || v === null ? null : Number(v))

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Score Applicant</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Enter applicant details (Home Credit features) to get a credit score, decision
          and variable-level explanation. External source scores may be left blank.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Annual income">
              <input type="number" min="0" step="1000" required value={form.AMT_INCOME_TOTAL} onChange={set('AMT_INCOME_TOTAL')} className={inputClass} />
            </Field>
            <Field label="Credit amount">
              <input type="number" min="0" step="1000" required value={form.AMT_CREDIT} onChange={set('AMT_CREDIT')} className={inputClass} />
            </Field>
            <Field label="Loan annuity">
              <input type="number" min="0" step="100" required value={form.AMT_ANNUITY} onChange={set('AMT_ANNUITY')} className={inputClass} />
            </Field>
            <Field label="Age (years)">
              <input type="number" min="18" max="100" step="0.5" required value={form.AGE_YEARS} onChange={set('AGE_YEARS')} className={inputClass} />
            </Field>
            <Field label="Years employed" hint="Blank = not working / pensioner">
              <input type="number" min="0" max="60" step="0.5" value={form.YEARS_EMPLOYED} onChange={set('YEARS_EMPLOYED')} className={inputClass} />
            </Field>
            <Field label="Family members">
              <input type="number" min="1" max="25" required value={form.CNT_FAM_MEMBERS} onChange={set('CNT_FAM_MEMBERS')} className={inputClass} />
            </Field>
            <Field label="Income type">
              <select value={form.NAME_INCOME_TYPE} onChange={set('NAME_INCOME_TYPE')} className={inputClass}>
                {INCOME_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Education">
              <select value={form.NAME_EDUCATION_TYPE} onChange={set('NAME_EDUCATION_TYPE')} className={inputClass}>
                {EDUCATION_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Family status">
              <select value={form.NAME_FAMILY_STATUS} onChange={set('NAME_FAMILY_STATUS')} className={inputClass}>
                {FAMILY_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Region rating" hint="1 = best, 3 = worst">
              <select value={form.REGION_RATING_CLIENT} onChange={set('REGION_RATING_CLIENT')} className={inputClass}>
                {[1, 2, 3].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Ext. source 1 (0–1)" hint="Optional">
              <input type="number" min="0" max="1" step="0.01" value={form.EXT_SOURCE_1} onChange={set('EXT_SOURCE_1')} className={inputClass} />
            </Field>
            <Field label="Ext. source 2 (0–1)" hint="Optional">
              <input type="number" min="0" max="1" step="0.01" value={form.EXT_SOURCE_2} onChange={set('EXT_SOURCE_2')} className={inputClass} />
            </Field>
            <Field label="Ext. source 3 (0–1)" hint="Optional">
              <input type="number" min="0" max="1" step="0.01" value={form.EXT_SOURCE_3} onChange={set('EXT_SOURCE_3')} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={form.CODE_GENDER} onChange={set('CODE_GENDER')} className={inputClass}>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </Field>
            <Field label="Owns car">
              <select value={form.FLAG_OWN_CAR} onChange={set('FLAG_OWN_CAR')} className={inputClass}>
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
            </Field>
            <Field label="Owns realty">
              <select value={form.FLAG_OWN_REALTY} onChange={set('FLAG_OWN_REALTY')} className={inputClass}>
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
            </Field>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm
                       hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Scoring…' : 'Score Applicant'}
          </button>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              {String(error)}
            </div>
          )}
        </form>

        <div className="lg:col-span-3 space-y-6">
          {!result && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
              Submit the form to see both scorecard results and the inclusion-gap classification.
            </div>
          )}

          {result && (
            <>
              {GAP_BANNERS[result.inclusion_gap_class] && (
                <div
                  className={`rounded-xl border px-5 py-4 ${GAP_BANNERS[result.inclusion_gap_class].cls}`}
                >
                  <p className="font-bold text-sm">
                    {GAP_BANNERS[result.inclusion_gap_class].title}
                  </p>
                  <p className="text-sm mt-0.5">
                    {GAP_BANNERS[result.inclusion_gap_class].text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScorePanel result={result.traditional} accentClass="text-sky-700" />
                <ScorePanel result={result.alternative} accentClass="text-violet-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="font-semibold text-sky-700 mb-1 text-sm">
                    Traditional — Variable Contributions
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Points added to / subtracted from the base score of {result.traditional.base_score}.
                  </p>
                  <ContributionChart contributions={result.traditional.contributions} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="font-semibold text-violet-700 mb-1 text-sm">
                    Alternative — Variable Contributions
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Non-bureau features only — no EXT_SOURCE, credit amount or region rating.
                  </p>
                  <ContributionChart contributions={result.alternative.contributions} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
