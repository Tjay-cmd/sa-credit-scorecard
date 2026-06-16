import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const BAND_COLORS = {
  accept: '#10b981',
  refer: '#f59e0b',
  reject: '#ef4444',
}

export default function ScoreDistributionChart({ distribution }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={distribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="min_score"
          tick={{ fontSize: 11, fill: '#64748b' }}
          interval={4}
        />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          formatter={(value) => [value.toLocaleString(), 'Applicants']}
          labelFormatter={(label, payload) =>
            payload?.[0] ? `Score ${payload[0].payload.bucket} · ${payload[0].payload.band}` : label
          }
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {distribution.map((entry) => (
            <Cell key={entry.bucket} fill={BAND_COLORS[entry.band] ?? '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
