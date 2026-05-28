import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

function TorchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C12 9 8 14 10 21C12 27 16 24 16 24C16 24 20 27 22 21C24 14 20 9 16 2Z"
        fill="currentColor" opacity="0.9"/>
      <path d="M13 22H19V38H13V22Z" fill="currentColor"/>
      <rect x="10" y="38" width="12" height="4" rx="2" fill="currentColor"/>
      <rect x="8"  y="42" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

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
    <aside className="w-[220px] min-h-screen bg-gray-900 flex flex-col flex-shrink-0">

      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-ul-700 flex items-center justify-center flex-shrink-0">
            <TorchIcon className="w-5 h-7 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block text-[10px] font-bold text-ul-400 uppercase tracking-wider">
              Universidad Libre
            </span>
            <span className="block text-xs font-semibold text-white">
              Seccional Barranquilla
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
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

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
