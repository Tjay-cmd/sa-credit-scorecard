const formatR = (v) =>
  v == null ? '—' : `R${Math.round(v).toLocaleString()}`

function DistBar({ items, color, muted = false }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-[13px]">
          <span
            className={`w-36 truncate ${muted ? 'text-[#5A8080]' : 'text-slate-300'}`}
            title={item.name}
          >
            {item.name}
          </span>
          <div className="flex-1 bg-[#0D2222] rounded-sm h-1.5 overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{ width: `${item.pct}%`, backgroundColor: color }}
            />
          </div>
          <span className={`w-10 text-right text-xs ${muted ? 'text-[#5A8080]' : 'text-[#8BAAAA]'}`}>
            {item.pct}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ProfileCard({
  title,
  subtitle,
  profile,
  variant = 'gap',
  defaultRateNote,
}) {
  const styles = {
    gap: {
      border: 'border-[rgba(251,191,36,0.25)]',
      accent: 'border-t-[#FBBF24]',
      dot: '#FBBF24',
      bar: '#FBBF24',
      rate: '#FBBF24',
    },
    reject: {
      border: 'border-[rgba(239,68,68,0.2)]',
      accent: 'border-t-[#EF4444]',
      dot: '#374151',
      bar: '#EF4444',
      rate: '#EF4444',
    },
  }[variant]

  if (!profile) {
    return (
      <div className="bg-[#112B2B] border border-[#1A3D3D] rounded-xl p-5 text-sm text-[#5A8080]">
        No applicants in this group.
      </div>
    )
  }

  return (
    <div
      className={`bg-[#112B2B] border ${styles.border} rounded-xl overflow-hidden border-t-[3px] ${styles.accent}`}
    >
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-[15px] text-white flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: styles.dot }}
            />
            {title}
          </h3>
          <p className="text-xs text-[#8BAAAA] mt-1">
            {subtitle} · {profile.count.toLocaleString()} applicants
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          {[
            { value: profile.avg_age, label: 'Avg age' },
            { value: formatR(profile.avg_income), label: 'Avg income' },
            { value: profile.avg_years_employed ?? '—', label: 'Yrs employed' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-[#0D2222] rounded-lg p-2 sm:p-3">
              <p className="text-[18px] sm:text-[22px] font-bold text-white leading-tight">{value}</p>
              <p className="text-[11px] text-[#5A8080] uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-medium text-[#5A8080] uppercase tracking-wide mb-2">
            Income type
          </p>
          <DistBar items={profile.income_type_distribution} color={styles.bar} />
        </div>

        <div>
          <p className="text-[11px] font-medium text-[#5A8080] uppercase tracking-wide mb-2">
            Education
          </p>
          <DistBar items={profile.education_distribution} color={styles.bar} />
        </div>

        <div className="border-t border-[#1A3D3D] pt-3.5 mt-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-[#8BAAAA]">Actual default rate (real outcomes)</p>
            <p className="text-[24px] sm:text-[28px] font-extrabold leading-none" style={{ color: styles.rate }}>
              {(profile.actual_default_rate * 100).toFixed(1)}%
            </p>
          </div>
          {defaultRateNote && (
            <p className="text-[11px] text-[#5A8080] mt-1">{defaultRateNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}
