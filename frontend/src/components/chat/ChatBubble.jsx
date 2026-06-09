function MiniMarkdown({ text }) {
  if (!text) return null

  return text.split('\n').map((line, i, arr) => {
    if (!line.trim()) return <br key={i} />

    const isBullet = /^[-*] /.test(line)
    const raw = isBullet ? line.slice(2) : line

    // Render **bold** spans inline
    const parts = raw.split(/(\*\*[^*\n]+\*\*)/)
    const inline = parts.map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
        : p
    )

    if (isBullet) {
      return (
        <div key={i} className="flex gap-1.5 mt-0.5 first:mt-0">
          <span className="shrink-0 text-gray-400 select-none">•</span>
          <span>{inline}</span>
        </div>
      )
    }

    return (
      <p key={i} className={i < arr.length - 1 ? 'mb-1.5' : ''}>
        {inline}
      </p>
    )
  })
}

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const formats = message.formats || []

  return (
    <div className={`flex items-end gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-ul-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">UL</span>
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-ul-700 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {isUser
            ? message.content
            : <MiniMarkdown text={message.content} />
          }
        </div>

        {/* Formatos descargables */}
        {!isUser && formats.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-xs text-gray-400 font-medium px-1">Formato disponible:</p>
            {formats.map((fmt) => (
              <a
                key={fmt.doc_id}
                href={fmt.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-ul-50 border border-ul-200 text-ul-800 rounded-xl text-xs font-medium hover:bg-ul-100 transition group"
              >
                <svg className="w-4 h-4 flex-shrink-0 text-ul-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <span className="truncate">{fmt.name}</span>
                <svg className="w-3 h-3 ml-auto flex-shrink-0 opacity-50 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
