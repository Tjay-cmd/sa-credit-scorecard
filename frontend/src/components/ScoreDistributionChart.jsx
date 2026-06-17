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
import { useChartHeight } from '../hooks/useChartHeight.js'

const BAND_COLORS = {
  accept: '#00CDB7',
  refer: '#FBBF24',
  reject: '#EF4444',
}

const TOOLTIP_STYLE = {
  backgroundColor: '#112B2B',
  border: '1px solid #1A3D3D',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

export default function ScoreDistributionChart({ distribution, className = '' }) {
  const height = useChartHeight(240, 320)

  return (
    <div className={`rounded-lg bg-[#0D2222] p-2 -mx-1 ${className}`}>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A3D3D" />
            <XAxis
              dataKey="min_score"
              tick={{ fontSize: 10, fill: '#8BAAAA' }}
              axisLine={{ stroke: '#1A3D3D' }}
              tickLine={{ stroke: '#1A3D3D' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8BAAAA' }}
              axisLine={{ stroke: '#1A3D3D' }}
              tickLine={{ stroke: '#1A3D3D' }}
              width={52}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value) => [value.toLocaleString(), 'Applicants']}
              labelFormatter={(label, payload) =>
                payload?.[0]
                  ? `Score ${payload[0].payload.bucket} · ${payload[0].payload.band}`
                  : label
              }
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {distribution.map((entry) => (
                <Cell key={entry.bucket} fill={BAND_COLORS[entry.band] ?? '#5A8080'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
