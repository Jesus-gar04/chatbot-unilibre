const STYLES = {
  indexed:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  processing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error:      'bg-red-50   text-red-700   border-red-200',
}

const LABELS = {
  indexed:    'Indexado',
  processing: 'Procesando',
  error:      'Error',
}

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || STYLES.error
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${cls}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
