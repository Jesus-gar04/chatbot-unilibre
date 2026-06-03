import { useState, useRef } from 'react'
import { uploadApi } from '../../api/client'

const ACCEPT = '.pdf,.docx,.txt'
const ACCEPT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export default function UploadZone({ onUploaded, docCategory = 'manual', compact = false }) {
  const [dragging, setDragging]   = useState(false)
  const [progress, setProgress]   = useState(null)   // null | 0-100
  const [phase, setPhase]         = useState('')      // 'uploading' | 'processing'
  const [status, setStatus]       = useState(null)    // null | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('')
  const inputRef = useRef(null)

  function showError(msg) {
    setProgress(null)
    setPhase('')
    setStatus('error')
    setStatusMsg(msg)
    // Los errores NO se auto-ocultan: el usuario debe verlos
  }

  function showSuccess(name) {
    setProgress(null)
    setPhase('')
    setStatus('success')
    setStatusMsg(`"${name}" indexado correctamente.`)
    // El éxito sí se oculta después de 5 s
    setTimeout(() => { setStatus(null); setStatusMsg('') }, 5000)
  }

  async function upload(file) {
    // Validar tipo
    if (!ACCEPT_TYPES.includes(file.type)) {
      showError('Tipo de archivo no soportado. Use PDF, DOCX o TXT.')
      return
    }
    // Validar tamaño
    if (file.size > 50 * 1024 * 1024) {
      showError('El archivo excede el límite de 50 MB.')
      return
    }

    const form = new FormData()
    form.append('file', file)
    form.append('doc_category', docCategory)

    setStatus(null)
    setStatusMsg('')
    setProgress(0)
    setPhase('uploading')

    try {
      await uploadApi.post('/admin/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setProgress(pct)
            // Una vez que el archivo llegó al servidor, pasa a fase de procesamiento
            if (pct === 100) setPhase('processing')
          }
        },
      })
      showSuccess(file.name)
      onUploaded()
    } catch (err) {
      // Diferenciar tipos de error para dar un mensaje útil
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        showError(
          'El servidor tardó demasiado en responder. ' +
          'Si es el primer uso del día, el servidor puede estar despertando — espere 30 segundos e intente de nuevo.'
        )
      } else if (!err.response) {
        showError(
          'No se pudo conectar con el servidor. ' +
          'Verifique que el backend esté en línea e intente de nuevo.'
        )
      } else {
        showError(
          err.response?.data?.detail || 'Error al procesar el documento. Intente de nuevo.'
        )
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) upload(file)
    e.target.value = ''
  }

  const dropProps = {
    onDragOver: (e) => { e.preventDefault(); setDragging(true) },
    onDragLeave: () => setDragging(false),
    onDrop: handleDrop,
    onClick: () => progress === null && inputRef.current?.click(),
  }

  const hiddenInput = (
    <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
  )

  /* ── Compact variant ── */
  if (compact) {
    return (
      <div className="mb-4">
        <div
          {...dropProps}
          className={`flex items-center gap-3 px-4 py-4 border border-dashed rounded-xl transition ${
            dragging
              ? 'border-ul-500 bg-ul-50 cursor-copy'
              : progress !== null
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-ul-400 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {hiddenInput}
          {progress === null ? (
            <>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs text-gray-600">
                Arrastrar o <span className="text-ul-700 font-medium">seleccionar archivo</span>
              </span>
              <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">PDF · DOCX · TXT · 50 MB</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-ul-700 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                {phase === 'uploading' ? `Subiendo… ${progress}%` : 'Indexando…'}
              </span>
              <div className="w-24 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${phase === 'processing' ? 'bg-ul-400 animate-pulse' : 'bg-ul-700'}`}
                  style={{ width: phase === 'processing' ? '100%' : `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
        {status && (
          <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            status === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span className="flex-1 min-w-0 truncate">{statusMsg}</span>
            {status === 'error' && (
              <button onClick={() => { setStatus(null); setStatusMsg('') }} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ── Full variant (default) ── */
  return (
    <div className="mb-6">
      <div
        {...dropProps}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          dragging
            ? 'border-ul-600 bg-ul-50 cursor-copy'
            : progress !== null
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-ul-500 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        {hiddenInput}
        {progress === null ? (
          <>
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Arrastre un archivo aquí o{' '}
              <span className="text-ul-700 underline underline-offset-2">haga clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF · DOCX · TXT · Máx. 50 MB</p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-ul-700 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-sm font-medium text-gray-700">
                {phase === 'uploading' ? `Subiendo… ${progress}%` : 'Generando embeddings e indexando…'}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${phase === 'processing' ? 'bg-ul-400 animate-pulse' : 'bg-ul-700'}`}
                style={{ width: phase === 'processing' ? '100%' : `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {status && (
        <div className={`mt-3 flex items-start gap-2 text-xs px-4 py-3 rounded-lg border ${
          status === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {status === 'error' && (
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
          <span>{statusMsg}</span>
          {status === 'error' && (
            <button onClick={() => { setStatus(null); setStatusMsg('') }} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
          )}
        </div>
      )}
    </div>
  )
}
