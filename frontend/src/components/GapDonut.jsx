import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export const GAP_META = {
  agreed_accept: { label: 'Agreed Accept', color: '#10b981' },
  inclusion_gap: { label: 'Inclusion Gap', color: '#f59e0b' },
  refer_overlap: { label: 'Refer Overlap', color: '#94a3b8' },
  risk_divergence: { label: 'Risk Divergence', color: '#ef4444' },
  agreed_reject: { label: 'Agreed Reject', color: '#475569' },
}

export default function GapDonut({ distribution, distributionPct }) {
  const data = Object.keys(GAP_META).map((key) => ({
    key,
    name: GAP_META[key].label,
    value: distribution[key],
    pct: distributionPct[key],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
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
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={GAP_META[entry.key].color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, item) => [
            `${value.toLocaleString()} (${item.payload.pct}%)`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value, entry) => `${value} · ${entry.payload.pct}%`}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
