export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-white text-xs font-bold">A</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
        </div>
      </div>
    </div>
  )
}
