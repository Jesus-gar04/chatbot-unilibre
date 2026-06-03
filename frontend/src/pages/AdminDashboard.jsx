import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import AdminSidebar from '../components/layout/AdminSidebar'
import UploadZone from '../components/admin/UploadZone'
import ConfirmModal from '../components/admin/ConfirmModal'
import StatusBadge from '../components/admin/StatusBadge'

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

function DocRow({ doc, onDelete }) {
  return (
    <tr className="hover:bg-gray-50 transition">
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
      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
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
  )
}

function DocTable({ docs, onDelete, emptyLabel }) {
  if (!docs.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">{emptyLabel}</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Nombre', 'Tipo', 'Tamaño', 'Chunks', 'Fecha', 'Estado', ''].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/documents')
      setDocuments(data)
    } catch {
      setError('No se pudo cargar la lista de documentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/documents/${deleteTarget.id}`)
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar el documento.')
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const manualDocs = documents.filter((d) => !d.doc_category || d.doc_category === 'manual')
  const formatoDocs = documents.filter((d) => d.doc_category === 'formato')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar docCount={documents.length} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Gestión de Documentos</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {manualDocs.length} manual{manualDocs.length !== 1 ? 'es' : ''} · {formatoDocs.length} formato{formatoDocs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={fetchDocuments}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Actualizar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </header>

        <div className="flex-1 px-8 py-6 space-y-10">
          {error && (
            <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
              {error}
              <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          {/* ── Sección 1: Manuales de Contexto ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Manuales de Contexto</h2>
                <p className="text-xs text-gray-500">
                  Documentos que alimentan el conocimiento del chatbot (reglamentos, guías, procedimientos).
                </p>
              </div>
              <span className="ml-auto text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                {manualDocs.length} documento{manualDocs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <UploadZone onUploaded={fetchDocuments} docCategory="manual" />

            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Cargando…</div>
            ) : (
              <DocTable
                docs={manualDocs}
                onDelete={(doc) => setDeleteTarget({ id: doc.id, name: doc.name })}
                emptyLabel="No hay manuales cargados aún"
              />
            )}
          </section>

          {/* Divisor */}
          <hr className="border-gray-200" />

          {/* ── Sección 2: Formatos Descargables ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Formatos Descargables</h2>
                <p className="text-xs text-gray-500">
                  Plantillas y formularios que el chatbot puede recomendar y el estudiante puede descargar.
                </p>
              </div>
              <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                {formatoDocs.length} formato{formatoDocs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <UploadZone onUploaded={fetchDocuments} docCategory="formato" />

            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Cargando…</div>
            ) : (
              <DocTable
                docs={formatoDocs}
                onDelete={(doc) => setDeleteTarget({ id: doc.id, name: doc.name })}
                emptyLabel="No hay formatos cargados aún"
              />
            )}
          </section>
        </div>
      </main>

      {deleteTarget && (
        <ConfirmModal
          docName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
