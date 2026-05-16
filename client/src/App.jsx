import { useState, useEffect, useCallback } from 'react'
import ChatView from './components/ChatView'
import ConfigPanel from './components/ConfigPanel'
import FlowerDecorations from './components/FlowerDecorations'
import Sidebar from './components/Sidebar'
import { User } from 'lucide-react'

function LoginGate({ onAuth }) {
  const [username, setUsername] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) { setError('请输入用户名'); return }
    try {
      const res = await fetch('/api/config/chat-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, username: username.trim() })
      })
      if (res.ok) {
        sessionStorage.setItem('bioweb-user', username.trim())
        sessionStorage.setItem('bioweb-chat-auth', '1')
        onAuth(username.trim())
      } else {
        setError('密码错误')
        setPwd('')
      }
    } catch { setError('连接失败') }
  }

  return (
    <div className="relative min-h-screen bg-cream overflow-hidden flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-bio-50/40 via-transparent to-bio-50/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bio-50/30 via-transparent to-bio-50/30" />
      </div>
      <FlowerDecorations />
      <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 w-80">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-bio-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-bio-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">BioWeb</h2>
          <p className="text-sm text-bio-600 mb-1">生物园艺文献检索助手</p>
          <p className="text-xs text-gray-400 mb-6">请输入用户名和密码</p>
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              placeholder="用户名"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none 
                         focus:border-bio-400 focus:ring-2 focus:ring-bio-100 transition-all text-center"
            />
            <input
              type="password"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError('') }}
              placeholder="密码"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none 
                         focus:border-bio-400 focus:ring-2 focus:ring-bio-100 transition-all text-center"
            />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-bio-500 text-white hover:bg-bio-600 transition-colors text-sm font-medium"
            >
              进入
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [chatAuthed, setChatAuthed] = useState(() => sessionStorage.getItem('bioweb-chat-auth') === '1')
  const [username, setUsername] = useState(() => sessionStorage.getItem('bioweb-user') || '')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState(null)
  const [settingsPassword, setSettingsPassword] = useState(() => sessionStorage.getItem('bioweb-settings-pwd') || '')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Session management
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      setConfig(data)
    } catch {}
  }

  useEffect(() => {
    if (chatAuthed && username) {
      loadConfig()
      loadSessions()
    }
  }, [chatAuthed, username])

  const loadSessions = async () => {
    try {
      const res = await fetch(`/api/sessions?user=${encodeURIComponent(username)}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {}
  }

  const handleNewChat = async () => {
    setCurrentSessionId(null)
  }

  const handleSelectSession = async (id) => {
    setCurrentSessionId(id)
    // Collapse sidebar on mobile
    if (window.innerWidth < 768) setSidebarCollapsed(true)
  }

  const handleDeleteSession = async (id) => {
    try {
      await fetch(`/api/sessions/${id}?user=${encodeURIComponent(username)}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.id !== id))
      if (currentSessionId === id) setCurrentSessionId(null)
    } catch {}
  }

  const handleSessionCreated = useCallback((session) => {
    setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)])
    setCurrentSessionId(session.id)
  }, [])

  const handleSessionUpdated = useCallback((session) => {
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, ...session } : s))
  }, [])

  if (!chatAuthed || !username) {
    return <LoginGate onAuth={(user) => { setUsername(user); setChatAuthed(true) }} />
  }

  return (
    <div className="relative min-h-screen bg-cream overflow-hidden">
      {/* Gradient border effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-bio-50/40 via-transparent to-bio-50/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bio-50/30 via-transparent to-bio-50/30" />
      </div>

      <FlowerDecorations />

      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        username={username}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setShowConfig(true)}
        onLogout={() => {
          sessionStorage.removeItem('bioweb-chat-auth')
          sessionStorage.removeItem('bioweb-user')
          setChatAuthed(false)
          setUsername('')
          setSessions([])
          setCurrentSessionId(null)
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content - shifts right when sidebar is open */}
      <div className={`relative z-10 min-h-screen flex flex-col transition-all duration-300
                       ${sidebarCollapsed ? 'md:ml-0' : 'md:ml-72'}`}>
        <ChatView 
          config={config} 
          sessionId={currentSessionId}
          username={username}
          onSessionCreated={handleSessionCreated}
          onSessionUpdated={handleSessionUpdated}
        />
      </div>

      {/* Config panel overlay */}
      {showConfig && (
        <ConfigPanel
          config={config}
          password={settingsPassword}
          onClose={() => setShowConfig(false)}
          onPasswordSet={(pwd) => {
            setSettingsPassword(pwd)
            sessionStorage.setItem('bioweb-settings-pwd', pwd)
          }}
          onConfigReload={loadConfig}
        />
      )}
    </div>
  )
}
