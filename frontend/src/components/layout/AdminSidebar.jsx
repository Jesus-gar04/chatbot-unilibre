import { useState, useMemo } from 'react'
import useAuthStore from '../../store/authStore'

function DocItem({ doc, onPreview }) {
  return (
    <button
      onClick={() => onPreview(doc)}
      title={doc.name}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/10 transition group"
    >
      <svg className="w-3 h-3 flex-shrink-0 text-white/40 group-hover:text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-xs text-white/75 group-hover:text-white truncate min-w-0 flex-1 leading-tight">
        {doc.name}
      </span>
      <span className="text-[9px] font-mono text-white/35 flex-shrink-0 group-hover:text-white/60">
        {doc.type}
      </span>
    </button>
  )
}

function DocSection({ label, icon, badgeColor, docs, onPreview, emptyText }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 mb-1">
        {icon}
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{label}</span>
        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
          {docs.length}
        </span>
      </div>
      {docs.length === 0 ? (
        <p className="text-[11px] text-white/35 px-2 py-1 italic">{emptyText}</p>
      ) : (
        <div className="space-y-0.5">
          {docs.map((doc) => (
            <DocItem key={doc.id} doc={doc} onPreview={onPreview} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminSidebar({ documents = [], onPreview }) {
  const { username, logout } = useAuthStore()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  const manualDocs = useMemo(() =>
    documents.filter((d) => (!d.doc_category || d.doc_category === 'manual') &&
      (!q || d.name.toLowerCase().includes(q))),
    [documents, q]
  )
  const formatoDocs = useMemo(() =>
    documents.filter((d) => d.doc_category === 'formato' &&
      (!q || d.name.toLowerCase().includes(q))),
    [documents, q]
  )

  const totalFiltered = manualDocs.length + formatoDocs.length
  const hasQuery = q.length > 0

  return (
    <aside className="w-[260px] h-screen bg-ul-700 flex flex-col flex-shrink-0 sticky top-0">

      {/* Brand */}
      <div className="px-4 py-4 border-b border-ul-800 flex items-center gap-3 flex-shrink-0">
        <img src="/logo.png" alt="Escudo Universidad Libre"
          className="w-10 h-10 object-contain drop-shadow flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <span className="block text-[11px] font-bold text-white tracking-wide truncate">Universidad Libre</span>
          <span className="block text-[10px] text-white/55 font-medium uppercase tracking-widest truncate">
            Seccional Barranquilla
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-white/10 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar documento…"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/10 text-white placeholder-white/40 rounded-lg border border-white/15 focus:outline-none focus:border-white/40 focus:bg-white/15 transition"
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {hasQuery && (
          <p className="text-[10px] text-white/50 mt-1.5 px-1">
            {totalFiltered === 0 ? 'Sin resultados' : `${totalFiltered} resultado${totalFiltered !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Doc lists — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
        <DocSection
          label="Manuales"
          icon={
            <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          badgeColor="bg-white/15 text-white/80"
          docs={manualDocs}
          onPreview={onPreview}
          emptyText={hasQuery ? 'Sin coincidencias' : 'Sin manuales'}
        />

        <div className="h-px bg-white/10" />

        <DocSection
          label="Formatos"
          icon={
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
          }
          badgeColor="bg-white/15 text-white/80"
          docs={formatoDocs}
          onPreview={onPreview}
          emptyText={hasQuery ? 'Sin coincidencias' : 'Sin formatos'}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-xs text-white/75 truncate">{username}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}
