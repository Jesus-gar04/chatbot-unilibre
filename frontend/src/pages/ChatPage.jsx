import { useState, useRef, useEffect } from 'react'
import ChatBubble from '../components/chat/ChatBubble'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'
import { streamChat } from '../api/client'

const WELCOME = {
  role: 'assistant',
  content:
    '¡Bienvenido al Asistente Virtual de la Universidad Libre Seccional Barranquilla! ' +
    'Estoy aquí para resolver tus dudas sobre procesos académicos, administrativos y ' +
    'reglamentarios de nuestra institución. ¿En qué puedo ayudarte hoy?',
  sources: [],
}

export default function ChatPage() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSubmit() {
    const query = input.trim()
    if (!query || streaming) return

    const userMsg = { role: 'user', content: query }
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', sources: [] },
    ])

    let fullContent = ''

    await streamChat(
      query,
      history,
      (token) => {
        fullContent += token
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: fullContent }
          return next
        })
      },
      (sources) => {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], sources }
          return next
        })
        setStreaming(false)
      },
      (errMsg) => {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: errMsg }
          return next
        })
        setStreaming(false)
      }
    )
  }

  function clearHistory() {
    setMessages([WELCOME])
    setInput('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="max-w-[760px] mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo + nombre */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Escudo Universidad Libre"
              className="w-12 h-12 object-contain drop-shadow-sm"
            />
            <div>
              <p className="text-[10px] font-bold text-ul-700 uppercase tracking-widest leading-none mb-0.5">
                Universidad Libre · Seccional Barranquilla
              </p>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Asistente Virtual Académico
              </h1>
            </div>
          </div>

          {/* Limpiar chat */}
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Nueva consulta
          </button>
        </div>
      </header>

      {/* ── Mensajes ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
        <div className="max-w-[760px] mx-auto">
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {streaming && messages[messages.length - 1]?.content === '' && (
            <TypingIndicator />
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input ── */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-[760px] mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={streaming}
          />
          <p className="text-center text-xs text-gray-400 mt-2">
            Las respuestas se basan exclusivamente en documentos oficiales cargados por la Secretaría.&nbsp;
            <span className="font-medium text-gray-500">Scientia · Fons · Libertatis</span>
          </p>
        </div>
      </footer>

    </div>
  )
}
