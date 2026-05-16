import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

export default function ChatInput({ onSend, onStop, isStreaming }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [text])

  const handleSubmit = () => {
    if (isStreaming) {
      onStop()
      return
    }
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="input-glow rounded-2xl bg-white/90 backdrop-blur-sm border border-bio-200/40">
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-gray-800 
                     placeholder:text-bio-400/50 text-[15px] leading-relaxed py-1.5 px-1
                     max-h-[200px] no-scrollbar"
          disabled={isStreaming}
        />
        <button
          onClick={handleSubmit}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                     transition-all duration-300 ${
            isStreaming
              ? 'bg-red-50 hover:bg-red-100 text-red-500'
              : text.trim()
                ? 'bg-bio-500 hover:bg-bio-600 text-white shadow-md shadow-bio-200/50'
                : 'bg-bio-100 text-bio-400 cursor-default'
          }`}
          disabled={!isStreaming && !text.trim()}
        >
          {isStreaming ? (
            <Square className="w-4 h-4" fill="currentColor" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
