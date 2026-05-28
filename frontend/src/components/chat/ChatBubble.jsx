export default function ChatBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-ul-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">UL</span>
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-ul-700 text-white rounded-br-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
          }`}
        >
          {message.content}
        </div>

        {/* Source tags */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-0.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
                {src.document}{src.page ? ` · p.${src.page}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
