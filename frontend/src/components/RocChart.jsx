import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const DIAGONAL = [
  { fpr: 0, tpr: 0 },
  { fpr: 1, tpr: 1 },
]

const TOOLTIP_STYLE = {
  backgroundColor: '#112B2B',
  border: '1px solid #1A3D3D',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

/** curves: [{ name, data: [{fpr, tpr}], color }] */
export default function RocChart({ curves }) {
  return (
    <div className="rounded-lg bg-[#0D2222] p-2 -mx-1">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A3D3D" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: '#8BAAAA' }}
            axisLine={{ stroke: '#1A3D3D' }}
            tickLine={{ stroke: '#1A3D3D' }}
            label={{
              value: 'False positive rate',
              position: 'insideBottom',
              offset: -2,
              fontSize: 11,
              fill: '#8BAAAA',
            }}
          />
          <YAxis
            dataKey="tpr"
            type="number"
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: '#8BAAAA' }}
            axisLine={{ stroke: '#1A3D3D' }}
            tickLine={{ stroke: '#1A3D3D' }}
            label={{
              value: 'True positive rate',
              angle: -90,
              position: 'insideLeft',
              offset: 18,
              fontSize: 11,
              fill: '#8BAAAA',
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [Number(value).toFixed(3), name]}
            labelFormatter={(label) => `FPR ${Number(label).toFixed(3)}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8BAAAA' }} />
          {curves.map((curve) => (
            <Line
              key={curve.name}
              data={curve.data}
              name={curve.name}
              type="monotone"
              dataKey="tpr"
              stroke={curve.color}
              strokeWidth={2.5}
              dot={false}
            />
          ))}
          <Line
            data={DIAGONAL}
            name="Random"
            type="linear"
            dataKey="tpr"
            stroke="#374151"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
