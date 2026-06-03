import { useState, useMemo } from 'react'
import useAuthStore from '../../store/authStore'

function DocItem({ doc, onPreview, onClose }) {
  return (
    <button
      onClick={() => { onPreview(doc); onClose?.() }}
      title={doc.name}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-white/15 active:bg-white/20 transition group"
    >
      <svg className="w-3 h-3 flex-shrink-0 text-white/50 group-hover:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-xs text-white/90 group-hover:text-white truncate min-w-0 flex-1 leading-tight">
        {doc.name}
      </span>
      <span className="text-[10px] font-mono text-white/50 flex-shrink-0 group-hover:text-white/70 bg-white/10 px-1 rounded">
        {doc.type}
      </span>
    </button>
  )
}

function DocSection({ label, icon, docs, onPreview, onClose, emptyText }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 mb-1.5">
        {icon}
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{label}</span>
        <span className="ml-auto text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {docs.length}
        </span>
      </div>
      {docs.length === 0
        ? <p className="text-xs text-white/45 px-2 py-1 italic">{emptyText}</p>
        : <div className="space-y-0.5">{docs.map((doc) => <DocItem key={doc.id} doc={doc} onPreview={onPreview} onClose={onClose} />)}</div>
      }
    </div>
  )
}

export default function AdminSidebar({ documents = [], onPreview, mobileOpen, onMobileClose }) {
  const { username, logout } = useAuthStore()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const manualDocs = useMemo(() =>
    documents.filter((d) => (!d.doc_category || d.doc_category === 'manual') && (!q || d.name.toLowerCase().includes(q))),
    [documents, q])

  const formatoDocs = useMemo(() =>
    documents.filter((d) => d.doc_category === 'formato' && (!q || d.name.toLowerCase().includes(q))),
    [documents, q])

  const totalFiltered = manualDocs.length + formatoDocs.length
  const hasQuery = q.length > 0

  const sidebar = (
    <aside className="w-[260px] bg-ul-700 flex flex-col h-full">

      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
        <img src="/logo.png" alt="Escudo Universidad Libre" className="w-10 h-10 object-contain drop-shadow flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <span className="block text-[12px] font-bold text-white tracking-wide truncate">Universidad Libre</span>
          <span className="block text-[10px] text-white/65 font-medium uppercase tracking-widest truncate">Seccional Barranquilla</span>
        </div>
        {/* Cerrar en mobile */}
        <button onClick={onMobileClose} className="md:hidden ml-auto p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-white/10 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documento…"
            className="w-full pl-8 pr-7 py-2 text-xs bg-white/10 text-white placeholder-white/45 rounded-lg border border-white/15 focus:outline-none focus:border-white/50 focus:bg-white/15 transition"
          />
          {hasQuery && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {hasQuery && (
          <p className="text-[11px] text-white/55 mt-1.5 px-1">
            {totalFiltered === 0 ? 'Sin resultados' : `${totalFiltered} resultado${totalFiltered !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Doc lists */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <DocSection
          label="Manuales"
          icon={<svg className="w-3.5 h-3.5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          docs={manualDocs} onPreview={onPreview} onClose={onMobileClose}
          emptyText={hasQuery ? 'Sin coincidencias' : 'Sin manuales cargados'}
        />
        <div className="h-px bg-white/10" />
        <DocSection
          label="Formatos"
          icon={<svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" /></svg>}
          docs={formatoDocs} onPreview={onPreview} onClose={onMobileClose}
          emptyText={hasQuery ? 'Sin coincidencias' : 'Sin formatos cargados'}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-sm text-white/85 truncate font-medium">{username}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/65 hover:text-white hover:bg-white/10 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: static */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        {sidebar}
      </div>

      {/* Mobile: drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="relative z-50 h-full">
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}
