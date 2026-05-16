import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { User, Leaf, ChevronDown, ChevronRight, Wrench, Brain, Copy, Check } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
      title="复制代码"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
    </button>
  )
}

function ThinkingBlock({ content }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!content) return null
  
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-bio-500/70 hover:text-bio-600 transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        <span>思考过程</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 pl-4 border-l-2 border-bio-200/40 text-sm text-gray-500 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  )
}

function ToolCallsBlock({ tools }) {
  const [expanded, setExpanded] = useState(false)
  
  if (!tools || tools.length === 0) return null
  
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-amber-500/70 hover:text-amber-600 transition-colors"
      >
        <Wrench className="w-3.5 h-3.5" />
        <span>工具调用 ({tools.length})</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {tools.map((tool, i) => (
            <div key={i} className="pl-4 border-l-2 border-amber-200/40">
              <div className="text-xs font-mono text-amber-700 bg-amber-50/50 px-2 py-1 rounded inline-block">
                {tool.name}
              </div>
              {tool.input && (
                <pre className="mt-1 text-xs text-gray-500 overflow-x-auto max-h-32 overflow-y-auto">
                  {tool.input.slice(0, 500)}{tool.input.length > 500 ? '...' : ''}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 py-4 animate-fade-in ${isUser ? '' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
        isUser 
          ? 'bg-gray-100 text-gray-500' 
          : 'bg-gradient-to-br from-bio-100 to-bio-200 text-bio-600'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Leaf className="w-4 h-4" />}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 mb-1">
          {isUser ? '你' : 'BioWeb'}
        </div>
        
        {!isUser && message.thinking && <ThinkingBlock content={message.thinking} />}
        {!isUser && message.tools && <ToolCallsBlock tools={message.tools} />}
        
        {isUser ? (
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre({ children, ...props }) {
                  const codeText = extractText(children)
                  return (
                    <div className="relative">
                      <pre {...props}>{children}</pre>
                      <CopyButton text={codeText} />
                    </div>
                  )
                },
                a({ href, children, ...props }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  )
                }
              }}
            >
              {message.content || ''}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-2 h-5 bg-bio-400 animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function extractText(children) {
  if (!children) return ''
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children.props?.children) return extractText(children.props.children)
  return ''
}
