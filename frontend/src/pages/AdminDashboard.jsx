import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client'
import AdminSidebar from '../components/layout/AdminSidebar'
import UploadZone from '../components/admin/UploadZone'
import ConfirmModal from '../components/admin/ConfirmModal'
import StatusBadge from '../components/admin/StatusBadge'
import DocPreviewModal from '../components/admin/DocPreviewModal'

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

function DocRow({ doc, onDelete, onPreview }) {
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[220px] truncate" title={doc.name}>
        {doc.name}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {doc.type}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatSize(doc.size)}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500">{doc.chunks}</td>
      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(doc.upload_date)}</td>
      <td className="px-4 py-2.5"><StatusBadge status={doc.status} /></td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onPreview(doc)}
            className="p-1.5 text-gray-400 hover:text-ul-700 hover:bg-ul-50 rounded-lg transition"
            title="Vista previa"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

function DocTable({ docs, onDelete, onPreview, search, emptyLabel }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? docs.filter((d) => d.name.toLowerCase().includes(q)) : docs
  }, [docs, search])

  if (!filtered.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">{search ? 'Sin resultados para esa búsqueda' : emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Nombre', 'Tipo', 'Tamaño', 'Chunks', 'Fecha', 'Estado', ''].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {filtered.map((doc) => (
            <DocRow key={doc.id} doc={doc} onDelete={onDelete} onPreview={onPreview} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  {
    id: 'manual',
    label: 'Manuales de Contexto',
    shortLabel: 'Manuales',
    description: 'Reglamentos, guías y procedimientos que alimentan el conocimiento del chatbot.',
    accentColor: 'blue',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'formato',
    label: 'Formatos Descargables',
    shortLabel: 'Formatos',
    description: 'Plantillas y formularios que el chatbot puede recomendar y el estudiante puede descargar.',
    accentColor: 'amber',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const TAB_STYLES = {
  blue: {
    active: 'border-blue-500 text-blue-700 bg-blue-50',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    header: 'bg-blue-50 border-blue-100',
    headerText: 'text-blue-800',
    headerDesc: 'text-blue-600',
  },
  amber: {
    active: 'border-amber-500 text-amber-700 bg-amber-50',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    header: 'bg-amber-50 border-amber-100',
    headerText: 'text-amber-800',
    headerDesc: 'text-amber-600',
  },
}

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('manual')
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null)

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

  // Reset search when switching tabs
  function switchTab(id) {
    setActiveTab(id)
    setSearch('')
  }

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

  const manualDocs = useMemo(() => documents.filter((d) => !d.doc_category || d.doc_category === 'manual'), [documents])
  const formatoDocs = useMemo(() => documents.filter((d) => d.doc_category === 'formato'), [documents])
  const countByTab = { manual: manualDocs.length, formato: formatoDocs.length }
  const activeDocs = activeTab === 'manual' ? manualDocs : formatoDocs
  const activeTabDef = TABS.find((t) => t.id === activeTab)
  const styles = TAB_STYLES[activeTabDef.accentColor]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar documents={documents} onPreview={setPreviewDoc} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top bar ── */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Gestión de Documentos</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {manualDocs.length} manual{manualDocs.length !== 1 ? 'es' : ''} · {formatoDocs.length} formato{formatoDocs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={fetchDocuments}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            title="Actualizar lista"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </header>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-6 mt-4 flex-shrink-0 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const s = TAB_STYLES[tab.accentColor]
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                    isActive
                      ? `${s.active} border-current`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={isActive ? s.icon : 'text-gray-400'}>{tab.icon}</span>
                  <span>{tab.shortLabel}</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? s.badge : 'bg-gray-100 text-gray-500'}`}>
                    {countByTab[tab.id]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">

            {/* Tab header */}
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-4 ${styles.header}`}>
              <span className={styles.icon}>{activeTabDef.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${styles.headerText}`}>{activeTabDef.label}</p>
                <p className={`text-xs mt-0.5 ${styles.headerDesc}`}>{activeTabDef.description}</p>
              </div>
            </div>

            {/* Compact upload */}
            <UploadZone onUploaded={fetchDocuments} docCategory={activeTab} compact />

            {/* Search + count row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar por nombre…"
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-ul-400 transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {activeDocs.length} documento{activeDocs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
            ) : (
              <DocTable
                docs={activeDocs}
                search={search}
                onDelete={(doc) => setDeleteTarget({ id: doc.id, name: doc.name })}
                onPreview={setPreviewDoc}
                emptyLabel={`No hay ${activeTab === 'manual' ? 'manuales' : 'formatos'} cargados aún`}
              />
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          docName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}
