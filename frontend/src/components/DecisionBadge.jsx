const STYLES = {
  accept: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  refer: 'bg-amber-100 text-amber-800 border-amber-300',
  reject: 'bg-red-100 text-red-800 border-red-300',
}

const LABELS = {
  accept: 'ACCEPT',
  refer: 'REFER',
  reject: 'REJECT',
}

export default function DecisionBadge({ decision, large = false }) {
  const size = large ? 'text-xl px-6 py-2' : 'text-xs px-3 py-1'
  return (
    <span
      className={`inline-block font-bold rounded-full border ${size} ${
        STYLES[decision] ?? 'bg-slate-100 text-slate-600 border-slate-300'
      }`}
    >
      {LABELS[decision] ?? decision}
    </span>
  )
}
