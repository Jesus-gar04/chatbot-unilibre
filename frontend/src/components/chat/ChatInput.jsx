import { useRef, useEffect } from 'react'

export default function ChatInput({ value, onChange, onSubmit, disabled }) {
  const ref = useRef(null)

  // Auto-grow textarea
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`
    }
  }, [value])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-ul-600 focus-within:ring-1 focus-within:ring-ul-600 transition">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Escribe tu pregunta…"
        className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none leading-relaxed"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-9 h-9 rounded-xl bg-ul-700 hover:bg-ul-800 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition"
        aria-label="Enviar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}
