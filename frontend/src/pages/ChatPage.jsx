import { useState, useRef, useEffect } from 'react'
import ChatBubble from '../components/chat/ChatBubble'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'
import { streamChat } from '../api/client'

const WELCOME = {
  role: 'assistant',
  content:
    '¡Hola! 👋 Soy Lara, tu asistente virtual de la Universidad Libre Seccional Barranquilla. ' +
    'Estoy aquí para ayudarte con tus dudas sobre procesos académicos, trámites y reglamentos. ' +
    '¿En qué te puedo ayudar hoy?',
  formats: [],
}

export default function ChatPage() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput]       = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSubmit() {
    const query = input.trim()
    if (!query || streaming) return

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, { role: 'user', content: query }])
    setInput('')
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '', formats: [] }])

    let fullContent = ''

    await streamChat(
      query, history,
      (token) => {
        fullContent += token
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], content: fullContent }
          return next
        })
      },
      (formats) => {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], formats }
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

  function clearHistory() { setMessages([WELCOME]); setInput('') }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0 safe-top">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Escudo Universidad Libre"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-ul-700 uppercase tracking-widest leading-none mb-0.5 truncate">
                Universidad Libre · Seccional Barranquilla
              </p>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">
                Asistente Virtual
              </h1>
            </div>
          </div>

          <button
            onClick={clearHistory}
            className="flex items-center gap-1 sm:gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition flex-shrink-0 px-2 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Nueva consulta</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) =>
            msg.content !== '' ? <ChatBubble key={i} message={msg} /> : null
          )}
          {streaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-white border-t border-gray-200 px-3 sm:px-4 pt-3 pb-4 sm:pb-5 flex-shrink-0 safe-bottom">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={streaming}
          />
          <p className="text-center text-[10px] sm:text-xs text-gray-400 mt-2 leading-snug px-2">
            Respuestas basadas en documentos oficiales de la Secretaría.{' '}
            <span className="font-medium text-gray-500 hidden sm:inline">Scientia · Fons · Libertatis</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
