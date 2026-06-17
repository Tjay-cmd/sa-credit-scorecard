import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const FEATURE_LABELS = {
  AMT_INCOME_TOTAL: 'Annual income',
  AMT_CREDIT: 'Credit amount',
  AMT_ANNUITY: 'Loan annuity',
  AGE_YEARS: 'Age',
  YEARS_EMPLOYED: 'Years employed',
  CNT_FAM_MEMBERS: 'Family members',
  NAME_INCOME_TYPE: 'Income type',
  NAME_EDUCATION_TYPE: 'Education',
  NAME_FAMILY_STATUS: 'Family status',
  REGION_RATING_CLIENT: 'Region rating',
  EXT_SOURCE_1: 'Ext. source 1',
  EXT_SOURCE_2: 'Ext. source 2',
  EXT_SOURCE_3: 'Ext. source 3',
  CODE_GENDER: 'Gender',
  FLAG_OWN_CAR: 'Owns car',
  FLAG_OWN_REALTY: 'Owns realty',
}

const TOOLTIP_DARK = {
  backgroundColor: '#112B2B',
  border: '1px solid #1A3D3D',
  borderRadius: 8,
  fontSize: 12,
  color: '#e2e8f0',
}

export default function ContributionChart({
  contributions,
  positiveColor = '#00CDB7',
  dark = false,
}) {
  const data = [...contributions]
    .sort((a, b) => b.points - a.points)
    .map((c) => ({
      ...c,
      label: FEATURE_LABELS[c.feature] ?? c.feature,
    }))

  const gridColor = dark ? '#1A3D3D' : '#e2e8f0'
  const axisTick = dark ? '#8BAAAA' : '#5A8080'
  const yAxisTick = dark ? '#8BAAAA' : '#334155'
  const refLine = dark ? '#1A3D3D' : '#475569'
  const negativeColor = '#EF4444'

  const chartHeight = Math.max(data.length * 42, 220)

  const chart = (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: axisTick }} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 10, fill: yAxisTick }}
        />
        <Tooltip
          contentStyle={dark ? TOOLTIP_DARK : undefined}
          formatter={(value) => [`${value > 0 ? '+' : ''}${value} pts`, 'Contribution']}
          labelFormatter={(label, payload) =>
            payload?.[0] ? `${label} · bin: ${payload[0].payload.bin}` : label
          }
        />
        <ReferenceLine x={0} stroke={refLine} />
        <Bar dataKey="points" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.feature}
              fill={entry.points >= 0 ? positiveColor : negativeColor}
            />
          ))}
        </Bar>
      </BarChart>
      </ResponsiveContainer>
    </div>
  )

  if (dark) {
    return <div className="rounded-lg bg-[#0D2222] p-2 -mx-1">{chart}</div>
  }
  return chart
}
