import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { Leaf } from 'lucide-react'

export default function ChatView({ config, sessionId, onSessionCreated, onSessionUpdated }) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [thinkingContent, setThinkingContent] = useState('')
  const [toolCalls, setToolCalls] = useState([])
  const [agentSessionId, setAgentSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)
  const currentSessionRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Load session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId)
    } else {
      setMessages([])
      setAgentSessionId(null)
      currentSessionRef.current = null
    }
  }, [sessionId])

  const loadSession = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}`)
      const data = await res.json()
      setMessages(data.messages || [])
      setAgentSessionId(data.agentSessionId || null)
      currentSessionRef.current = id
    } catch {
      setMessages([])
    }
  }

  const ensureSession = async () => {
    if (currentSessionRef.current) return currentSessionRef.current
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: config?.activeAgent || 'claude' })
      })
      const session = await res.json()
      currentSessionRef.current = session.id
      onSessionCreated(session)
      return session.id
    } catch {
      return null
    }
  }

  const saveMessage = async (sid, message) => {
    try {
      const res = await fetch(`/api/sessions/${sid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      const updated = await res.json()
      onSessionUpdated({ id: sid, title: updated.title, updatedAt: updated.updatedAt })
    } catch {}
  }

  const saveAgentSessionId = async (sid, aSessionId) => {
    try {
      await fetch(`/api/sessions/${sid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSessionId: aSessionId })
      })
    } catch {}
  }

  const handleSend = async (text) => {
    if (!text.trim() || isStreaming) return

    const sid = await ensureSession()
    const userMsg = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingContent('')
    setThinkingContent('')
    setToolCalls([])

    if (sid) saveMessage(sid, userMsg)

    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      const body = { message: text }
      // Use --resume if we have a previous agent session
      if (agentSessionId) {
        body.resumeSessionId = agentSessionId
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let fullThinking = ''
      let currentTools = []
      let buffer = ''
      let newAgentSessionId = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            
            switch (event.type) {
              case 'text':
                fullText += event.content || ''
                setStreamingContent(fullText)
                break
              case 'thinking':
                fullThinking += event.content || ''
                setThinkingContent(fullThinking)
                break
              case 'tool_start':
                currentTools = [...currentTools, { name: event.tool, id: event.id, input: '' }]
                setToolCalls([...currentTools])
                break
              case 'tool_input':
                if (currentTools.length > 0) {
                  currentTools[currentTools.length - 1].input += event.content || ''
                  setToolCalls([...currentTools])
                }
                break
              case 'stderr':
                if (event.content && !event.content.includes('Warning:')) {
                  fullText += event.content
                  setStreamingContent(fullText)
                }
                break
              case 'result':
                if (event.content && !fullText) {
                  fullText = typeof event.content === 'string' ? event.content : JSON.stringify(event.content)
                  setStreamingContent(fullText)
                }
                break
              case 'done':
                if (event.agentSessionId) {
                  newAgentSessionId = event.agentSessionId
                }
                break
              case 'error':
                fullText += `\n\n❌ **Error:** ${event.content}`
                setStreamingContent(fullText)
                break
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Save agent session ID for --resume
      if (newAgentSessionId && newAgentSessionId !== agentSessionId) {
        setAgentSessionId(newAgentSessionId)
        if (sid) saveAgentSessionId(sid, newAgentSessionId)
      }

      const assistantMsg = {
        role: 'assistant',
        content: fullText || '(No response)',
        thinking: fullThinking || null,
        tools: currentTools.length > 0 ? currentTools : null,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMsg])
      if (sid) saveMessage(sid, assistantMsg)

    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ **连接错误:** ${err.message}\n\n请检查服务是否正常运行。`,
          timestamp: Date.now()
        }])
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      setThinkingContent('')
      setToolCalls([])
      abortRef.current = null
    }
  }

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto py-6">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-bio-100 to-bio-200 
                              flex items-center justify-center mb-6 shadow-lg shadow-bio-100/50">
                <Leaf className="w-10 h-10 text-bio-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-semibold text-bio-800 mb-3">
                BioWeb
              </h1>
              <p className="text-bio-600/70 text-center max-w-md leading-relaxed text-sm md:text-base">
                生物园艺文献检索助手<br />
                <span className="text-bio-500/50 text-xs">输入您的问题，开始探索植物科学的世界</span>
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['山茶花栽培技术', '月季抗病基因研究', 'CRISPR植物基因编辑'].map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(hint)}
                    className="px-4 py-2 text-sm rounded-full border border-bio-200/60 
                               text-bio-700 bg-white/60 backdrop-blur
                               hover:bg-bio-50 hover:border-bio-300 transition-all duration-200"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <ChatMessage
              message={{
                role: 'assistant',
                content: streamingContent,
                thinking: thinkingContent,
                tools: toolCalls.length > 0 ? toolCalls : null,
                isStreaming: true
              }}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 bg-gradient-to-t from-cream via-cream to-transparent pt-6 pb-4 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
          <p className="text-center text-xs text-bio-400/60 mt-2">
            BioWeb 可能会出错，请核实重要信息
          </p>
        </div>
      </div>
    </div>
  )
}
