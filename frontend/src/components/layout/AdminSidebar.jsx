import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const NAV = [
  {
    to: '/admin/dashboard',
    label: 'Documentos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function AdminSidebar({ docCount }) {
  const { username, logout } = useAuthStore()

  return (
    <aside className="w-[220px] min-h-screen bg-gray-950 flex flex-col flex-shrink-0">

      {/* ── Brand ── */}
      <div className="px-5 py-5 border-b border-gray-800">
        {/* Escudo */}
        <div className="flex justify-center mb-3">
          <img
            src="/logo.png"
            alt="Escudo Universidad Libre"
            className="w-14 h-14 object-contain drop-shadow-md"
          />
        </div>
        {/* Nombre */}
        <div className="text-center leading-tight">
          <span className="block text-[11px] font-bold text-white tracking-wide">
            Universidad Libre
          </span>
          <span className="block text-[10px] text-ul-400 font-semibold uppercase tracking-widest mt-0.5">
            Seccional Barranquilla
          </span>
        </div>
      </div>

      {/* ── Franja roja ── */}
      <div className="h-0.5 bg-ul-700 mx-4" />

      {/* ── Navegación ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-ul-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
            {item.label === 'Documentos' && docCount > 0 && (
              <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                {docCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Usuario / Logout ── */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-ul-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-xs text-gray-400 truncate">{username}</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
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
