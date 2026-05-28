export default function ConfirmModal({ docName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Eliminar documento</h3>
            <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          ¿Está seguro de que desea eliminar{' '}
          <span className="font-medium">"{docName}"</span> del índice?
          Todos sus chunks serán removidos del vector store.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
