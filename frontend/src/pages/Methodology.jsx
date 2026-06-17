import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getModelStats } from '../api/client.js'

function Card({ title, children }) {
  return (
    <section className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-6 mb-4">
      <h3 className="text-white text-[15px] font-semibold mb-3">{title}</h3>
      <div className="text-sm text-slate-300 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function FormulaBlock({ lines }) {
  return (
    <pre className="bg-[#0D2222] border border-[#1A3D3D] rounded-lg px-4 py-3 text-[13px] font-mono text-[#00CDB7] leading-relaxed overflow-x-auto">
      {lines.join('\n')}
    </pre>
  )
}

function StatPills({ items }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {items.map((item) => (
        <span
          key={item}
          className="bg-[#0D2222] border border-[#1A3D3D] text-[#8BAAAA] text-xs rounded-full px-3 py-1"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function PageLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-block text-sm font-medium text-[#00CDB7] hover:text-[#00A896] transition-colors mt-1"
    >
      {children}
    </Link>
  )
}

const FALLBACK_CUTOFFS = {
  traditional: { accept: 603, refer: 587 },
  alternative: { accept: 598, refer: 590 },
}

export default function Methodology() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getModelStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const trad = stats?.traditional?.thresholds ?? FALLBACK_CUTOFFS.traditional
  const alt = stats?.alternative?.thresholds ?? FALLBACK_CUTOFFS.alternative

  return (
    <div className="page-container max-w-3xl">
      <header className="border-b border-[#1A3D3D] pb-5 mb-6 md:mb-7">
        <h2 className="page-title">Methodology</h2>
        <p className="text-[13px] text-[#8BAAAA] mt-1">
          How the scorecard is built, scored, and validated
        </p>
      </header>

      <Card title="Data">
        <p>
          Training data comes from the Kaggle Home Credit Default Risk competition: 307,511 loan
          applications with an 8.07% default rate. Real South African bureau data isn&apos;t
          publicly available, so this is used as a structural proxy: it has the same kind of bureau
          and behavioural features an SA scorecard would use, even though the underlying market and
          risk distributions are different. The Limitations section below covers what that means for
          the results.
        </p>
        <StatPills
          items={[
            '307,511 rows',
            '16 features selected',
            '8.07% bad rate',
            '80/20 stratified split',
          ]}
        />
      </Card>

      <Card title="WOE binning & information value">
        <p>
          Continuous inputs are split into bins with a shallow decision tree (max six leaves). Each
          bin gets a Weight of Evidence (WOE) score that shows whether goods or bads dominate in
          that segment. Information Value (IV) sums that signal across bins so you can rank
          variables by overall predictive power.
        </p>
        <FormulaBlock
          lines={[
            'WOE = ln[(% good + 0.5) / (% bad + 0.5)]',
            'IV = sum of (% good − % bad) × WOE across all bins',
          ]}
        />
        <p>Variables with IV below 0.02 are dropped. They add little beyond noise.</p>
        <PageLink to="/woe">See live WOE tables →</PageLink>
      </Card>

      <Card title="Scorecard scaling">
        <p>
          The logistic model outputs log-odds. PDO (Points to Double the Odds) turns that into a
          familiar credit score. Base score is 600. A 20-point move on the scale doubles the odds of
          default. Each variable contributes a fixed number of points from its WOE and coefficient.
        </p>
        <FormulaBlock
          lines={[
            'factor = PDO / ln(2)',
            'points per variable = −factor × coefficient × WOE',
            'final score = 600 + sum of all variable points',
          ]}
        />
        <p>
          Variable points always add up to (score − 600). You can reconcile any score by hand from
          the WOE tables.
        </p>
      </Card>

      <Card title="Decision thresholds">
        <p>
          Accept, refer, and reject cutoffs are not hard-coded. After each train run, they are set
          from percentiles of the training score distribution: below the 20th percentile is reject,
          between the 20th and 40th is refer, above the 40th is accept.
        </p>
        <div className="table-scroll-wrap rounded-lg border border-[#1A3D3D] w-full max-w-full min-w-0">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="bg-[#0D2222] text-left">
                <th className="py-2.5 px-3 text-[11px] uppercase tracking-wide text-[#8BAAAA] font-medium">
                  Scorecard
                </th>
                <th className="py-2.5 px-3 text-[11px] uppercase tracking-wide text-[#8BAAAA] font-medium text-right">
                  Accept ≥
                </th>
                <th className="py-2.5 px-3 text-[11px] uppercase tracking-wide text-[#8BAAAA] font-medium text-right">
                  Refer ≥
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#1A3D3D]/50 bg-[#112B2B]">
                <td className="py-2.5 px-3 text-white">Traditional</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00CDB7]">{trad.accept}</td>
                <td className="py-2.5 px-3 text-right font-mono text-white">{trad.refer}</td>
              </tr>
              <tr className="border-t border-[#1A3D3D]/50 bg-[#0F2424]">
                <td className="py-2.5 px-3 text-white">Alternative</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#A78BFA]">{alt.accept}</td>
                <td className="py-2.5 px-3 text-right font-mono text-white">{alt.refer}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="table-scroll-hint">Scroll for more →</p>
      </Card>

      <Card title="Why a scorecard, not just XGBoost">
        <p>
          The National Credit Act requires lenders to explain adverse credit decisions in language
          the consumer can follow. A points scorecard maps each input to documented bins and point
          values. An auditor can replay the arithmetic without opening a model file.
        </p>
        <p>
          XGBoost on the same features usually beats the scorecard on AUC in our holdout tests.
          SHAP helps inspect those predictions after the fact. Production still runs the scorecard
          because regulators and dispute teams need a fixed point ledger, not feature attributions
          computed on demand.
        </p>
        <PageLink to="/dashboard">See model comparison →</PageLink>
      </Card>

      <Card title="Measuring the inclusion gap">
        <p>
          The alternative scorecard uses the same WOE and PDO pipeline. It is trained only on
          non-bureau fields: age, employment, income, education, family status, and similar
          behavioural inputs. Bureau scores and credit exposure fields are left out.
        </p>
        <p>
          Every holdout applicant gets a decision from both models. We bucket them into five
          groups: agreed accept, agreed reject, inclusion gap (traditional rejects or refers,
          alternative accepts), risk divergence (traditional accepts, alternative rejects), and
          refer overlap (at least one model refers). We then compare actual default rates inside
          each bucket.
        </p>
        <PageLink to="/inclusion">See full inclusion gap analysis →</PageLink>
      </Card>

      <Card title="Limitations">
        <ul className="list-disc pl-5 space-y-2 text-slate-300 marker:text-[#5A8080]">
          <li>
            Home Credit did not publish which country this portfolio comes from. It is overseas
            retail lending, not South African. The inclusion gap pattern is useful for method, but
            the percentages and counts would shift on real SA portfolios.
          </li>
          <li>
            Live alternative-data programs would pull mobile money, airtime, and utility payments.
            Those columns are not in this dataset, so the alternative scorecard is a partial proxy.
          </li>
          <li>
            The alternative model’s lower AUC means its accept decisions carry more realised
            default risk than the traditional scorecard’s accepts at the same volume mix.
          </li>
          <li>
            The R4.87 billion cost-of-exclusion figure on the inclusion page is gap count times
            average requested credit. It shows scale on the holdout sample only. It is not a market
            sizing exercise.
          </li>
        </ul>
      </Card>

      <Card title="Built with">
        <StatPills
          items={[
            'FastAPI',
            'scikit-learn',
            'XGBoost',
            'SHAP',
            'React',
            'Recharts',
            'Tailwind CSS',
          ]}
        />
      </Card>
    </div>
  )
}
