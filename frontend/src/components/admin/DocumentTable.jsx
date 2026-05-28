import StatusBadge from './StatusBadge'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function DocumentTable({ documents, onDelete }) {
  if (!documents.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No hay documentos indexados</p>
        <p className="text-xs mt-1">Cargue un PDF, DOCX o TXT para comenzar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Nombre', 'Tipo', 'Tamaño', 'Chunks', 'Fecha', 'Estado', ''].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-medium text-gray-800 max-w-[220px] truncate" title={doc.name}>
                {doc.name}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {doc.type}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatSize(doc.size)}</td>
              <td className="px-4 py-3 text-gray-600">{doc.chunks}</td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(doc.upload_date)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={doc.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(doc)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
