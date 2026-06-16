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

export default function ContributionChart({ contributions }) {
  const data = [...contributions]
    .sort((a, b) => b.points - a.points)
    .map((c) => ({
      ...c,
      label: FEATURE_LABELS[c.feature] ?? c.feature,
    }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 42, 220)}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fontSize: 12, fill: '#334155' }}
        />
        <Tooltip
          formatter={(value) => [`${value > 0 ? '+' : ''}${value} pts`, 'Contribution']}
          labelFormatter={(label, payload) =>
            payload?.[0] ? `${label} · bin: ${payload[0].payload.bin}` : label
          }
        />
        <ReferenceLine x={0} stroke="#475569" />
        <Bar dataKey="points" radius={[0, 3, 3, 0]}>
          {data.map((entry) => (
            <Cell key={entry.feature} fill={entry.points >= 0 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
