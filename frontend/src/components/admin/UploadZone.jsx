import { useState, useRef } from 'react'
import { api } from '../../api/client'

const ACCEPT = '.pdf,.docx,.txt'
const ACCEPT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export default function UploadZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null)  // null | 0-100
  const [status, setStatus] = useState(null)       // null | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('')
  const inputRef = useRef(null)

  function reset() {
    setTimeout(() => {
      setProgress(null)
      setStatus(null)
      setStatusMsg('')
    }, 3000)
  }

  async function upload(file) {
    if (!ACCEPT_TYPES.includes(file.type)) {
      setStatus('error')
      setStatusMsg('Tipo de archivo no soportado. Use PDF, DOCX o TXT.')
      reset()
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setStatus('error')
      setStatusMsg('El archivo excede el límite de 50 MB.')
      reset()
      return
    }

    const form = new FormData()
    form.append('file', file)
    setProgress(0)
    setStatus(null)

    try {
      await api.post('/admin/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })
      setProgress(100)
      setStatus('success')
      setStatusMsg(`"${file.name}" indexado correctamente.`)
      onUploaded()
    } catch (err) {
      setStatus('error')
      setStatusMsg(err.response?.data?.detail || 'Error al cargar el documento.')
    } finally {
      reset()
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

  return (
    <div className="mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => progress === null && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          dragging
            ? 'border-navy-500 bg-navy-50'
            : 'border-gray-300 hover:border-navy-400 hover:bg-gray-50'
        } ${progress !== null ? 'pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />

        {progress === null ? (
          <>
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Arrastre un archivo aquí o{' '}
              <span className="text-navy-600 underline underline-offset-2">haga clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF · DOCX · TXT · Máx. 50 MB</p>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {progress < 100 ? `Subiendo… ${progress}%` : 'Procesando e indexando…'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-navy-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {status && (
        <div className={`mt-3 text-xs px-4 py-2.5 rounded-lg border ${
          status === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {statusMsg}
        </div>
      )}
    </div>
  )
}
