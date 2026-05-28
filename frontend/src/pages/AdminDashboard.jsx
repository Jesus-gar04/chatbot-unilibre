import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import AdminSidebar from '../components/layout/AdminSidebar'
import DocumentTable from '../components/admin/DocumentTable'
import UploadZone from '../components/admin/UploadZone'
import ConfirmModal from '../components/admin/ConfirmModal'

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)  // {id, name}
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/documents')
      setDocuments(data)
    } catch (err) {
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

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks || 0), 0)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar docCount={documents.length} />

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Documentos</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {documents.length} documento{documents.length !== 1 ? 's' : ''} indexado{documents.length !== 1 ? 's' : ''} · {totalChunks} chunks totales
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

        {/* Content */}
        <div className="flex-1 px-8 py-6">
          {error && (
            <div className="mb-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
              {error}
              <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          <UploadZone onUploaded={fetchDocuments} />

          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Documentos indexados
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Cargando…</div>
          ) : (
            <DocumentTable
              documents={documents}
              onDelete={(doc) => setDeleteTarget({ id: doc.id, name: doc.name })}
            />
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
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
