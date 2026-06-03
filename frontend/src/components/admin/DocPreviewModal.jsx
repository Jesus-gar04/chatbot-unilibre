import { useState, useEffect } from 'react'
import { api } from '../../api/client'

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

export default function DocPreviewModal({ doc, onClose }) {
  const [fileUrl, setFileUrl] = useState(null)
  const [txtContent, setTxtContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchUrl() {
      try {
        const { data } = await api.get(`/admin/documents/${doc.id}/file-url`)
        if (cancelled) return
        setFileUrl(data.download_url)

        // Para TXT: cargar el contenido directamente
        if (doc.type === 'TXT') {
          const resp = await fetch(data.download_url)
          const text = await resp.text()
          if (!cancelled) setTxtContent(text)
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el archivo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchUrl()
    return () => { cancelled = true }
  }, [doc.id, doc.type])

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const categoryLabel = doc.doc_category === 'formato' ? 'Formato Descargable' : 'Manual de Contexto'
  const categoryColor = doc.doc_category === 'formato'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-blue-100 text-blue-800 border-blue-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 bg-white flex flex-col w-full h-full sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-4xl sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 break-all leading-snug">{doc.name}</p>
            <div className="flex items-center flex-wrap gap-2 mt-1.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${categoryColor}`}>
                {categoryLabel}
              </span>
              <span className="text-[11px] text-gray-400">{formatSize(doc.size)}</span>
              <span className="text-[11px] text-gray-400">{doc.chunks} chunks</span>
              <span className="text-[11px] text-gray-400">{formatDate(doc.upload_date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botón descargar */}
            {fileUrl && (
              <a
                href={fileUrl}
                download={doc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ul-700 hover:bg-ul-800 text-white text-xs font-medium rounded-lg transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar
              </a>
            )}
            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — preview */}
        <div className="flex-1 overflow-hidden sm:rounded-b-2xl bg-gray-50 min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm">Cargando vista previa…</span>
            </div>
          )}

          {!loading && error && (
            <div className="text-center text-red-500 text-sm px-6">{error}</div>
          )}

          {!loading && !error && doc.type === 'PDF' && fileUrl && (
            <iframe
              src={fileUrl}
              title={doc.name}
              className="w-full h-full min-h-[500px] rounded-b-2xl border-0"
            />
          )}

          {!loading && !error && doc.type === 'TXT' && (
            <div className="w-full h-full overflow-auto p-6">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {txtContent || '(archivo vacío)'}
              </pre>
            </div>
          )}

          {!loading && !error && doc.type === 'DOCX' && (
            <div className="text-center px-8 py-12 space-y-4">
              <svg className="w-14 h-14 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">
                Los archivos DOCX no se pueden previsualizar en el navegador.
              </p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={doc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ul-700 hover:bg-ul-800 text-white text-sm font-medium rounded-xl transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar para ver
                </a>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
