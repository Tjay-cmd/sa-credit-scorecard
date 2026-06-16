const formatR = (v) =>
  v == null ? '—' : `R${Math.round(v).toLocaleString('en-ZA')}`

function DistBar({ items, color }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <span className="w-36 truncate text-slate-600" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 bg-slate-100 rounded h-2.5 overflow-hidden">
            <div
              className="h-full rounded"
              style={{ width: `${item.pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="w-10 text-right font-mono text-slate-500">{item.pct}%</span>
        </div>
      ))}
    </div>
  )
}

export default function ProfileCard({ title, subtitle, profile, color, defaultRateNote }) {
  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-400">
        No applicants in this group.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle} · {profile.count.toLocaleString()} applicants
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-slate-800">{profile.avg_age}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg age</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-slate-800">{formatR(profile.avg_income)}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg income</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5">
          <p className="text-lg font-bold text-slate-800">
            {profile.avg_years_employed ?? '—'}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Yrs employed</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Income type</p>
        <DistBar items={profile.income_type_distribution} color={color} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Education</p>
        <DistBar items={profile.education_distribution} color={color} />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-slate-500">Actual default rate (real outcomes)</p>
          <p className="text-2xl font-extrabold" style={{ color }}>
            {(profile.actual_default_rate * 100).toFixed(1)}%
          </p>
        </div>
        {defaultRateNote && (
          <p className="text-[11px] text-slate-400 mt-1">{defaultRateNote}</p>
        )}
      </div>
    </div>
  )
}
