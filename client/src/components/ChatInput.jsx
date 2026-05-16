import { useState, useRef, useEffect } from 'react'
import { Send, Square, Plus, X, Paperclip } from 'lucide-react'

export default function ChatInput({ onSend, onStop, isStreaming, showAttachment = false }) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

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
    onSend(text.trim(), attachment)
    setText('')
    setAttachment(null)
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachment(file)
    }
    e.target.value = ''
  }

  return (
    <div className="input-glow rounded-2xl bg-white/90 backdrop-blur-sm border border-bio-200/40">
      {/* Attachment preview */}
      {attachment && (
        <div className="px-3 pt-3 pb-0">
          <div className="inline-flex items-center gap-2 bg-bio-50 rounded-lg px-3 py-1.5 text-sm text-bio-700">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="max-w-[200px] truncate">{attachment.name}</span>
            <button
              onClick={() => setAttachment(null)}
              className="w-4 h-4 rounded-full bg-bio-200 hover:bg-bio-300 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment button — only for copilot */}
        {showAttachment && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,.html,.py,.js,.ts,.java,.c,.cpp,.go,.rs"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                         bg-bio-50 hover:bg-bio-100 text-bio-500 hover:text-bio-600
                         transition-all duration-200 mb-0.5"
              title="上传图片或文件"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        )}
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
