import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export const GAP_META = {
  agreed_accept: { label: 'Agreed Accept', color: '#00CDB7' },
  inclusion_gap: { label: 'Inclusion Gap', color: '#FBBF24' },
  refer_overlap: { label: 'Refer Overlap', color: '#6B7280' },
  risk_divergence: { label: 'Risk Divergence', color: '#EF4444' },
  agreed_reject: { label: 'Agreed Reject', color: '#374151' },
}

const TOOLTIP_STYLE = {
  backgroundColor: '#112B2B',
  border: '1px solid #1A3D3D',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

export default function GapDonut({ distribution, distributionPct }) {
  const data = Object.keys(GAP_META).map((key) => ({
    key,
    name: GAP_META[key].label,
    value: distribution[key],
    pct: distributionPct[key],
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={GAP_META[entry.key].color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name, item) => [
              `${value.toLocaleString()} (${item.payload.pct}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
        {data.map((entry) => (
          <div key={entry.key} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: GAP_META[entry.key].color }}
            />
            <span>{entry.name}</span>
            <span className="font-bold">{entry.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
