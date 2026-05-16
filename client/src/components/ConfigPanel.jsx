import { useState, useEffect, useRef } from 'react'
import { X, Lock, Check, Monitor, Cpu, BookOpen, Plus, Save, Trash2, Edit3, Eye, EyeOff, ChevronDown, FolderOpen } from 'lucide-react'
import FileManager from './FileManager'

function PasswordGate({ onAuth, onClose }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/config/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      })
      if (res.ok) {
        onAuth(pwd)
      } else {
        setError('密码错误')
        setPwd('')
      }
    } catch { setError('连接失败') }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-14 h-14 rounded-full bg-bio-100 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-bio-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">管理面板</h3>
      <p className="text-sm text-gray-400 mb-6">请输入管理密码</p>
      <form onSubmit={handleSubmit} className="w-64 space-y-3">
        <input
          ref={inputRef}
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
  )
}

function AgentConfig({ config, password, onUpdate }) {
  const [activeAgent, setActiveAgent] = useState(config?.activeAgent || 'claude')
  const [agents, setAgents] = useState(config?.agents || {})
  const [showThinking, setShowThinking] = useState(config?.showThinking ?? true)
  const [showToolCalls, setShowToolCalls] = useState(config?.showToolCalls ?? true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-password': password },
        body: JSON.stringify({ activeAgent, agents, showThinking, showToolCalls })
      })
      if (res.ok) {
        const data = await res.json()
        onUpdate(data.config)
      }
    } catch {}
    setSaving(false)
  }

  const updateAgentModel = (name, model) => {
    setAgents(prev => ({
      ...prev,
      [name]: { ...prev[name], model }
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4" /> 当前 Agent
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(agents).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setActiveAgent(key)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeAgent === key
                  ? 'bg-bio-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {val.name || key}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">模型配置</h4>
        {Object.entries(agents).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 mb-2">
            <span className="w-16 text-xs text-gray-500 flex-shrink-0">{val.name || key}</span>
            <input
              value={val.model || ''}
              onChange={(e) => updateAgentModel(key, e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 
                         outline-none focus:border-bio-400 transition-colors"
              placeholder="model name"
            />
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4" /> 显示设置
        </h4>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">显示思考过程</span>
            <button
              onClick={() => setShowThinking(!showThinking)}
              className={`w-10 h-6 rounded-full transition-colors ${showThinking ? 'bg-bio-500' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${showThinking ? 'translate-x-4' : ''}`} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">显示工具调用</span>
            <button
              onClick={() => setShowToolCalls(!showToolCalls)}
              className={`w-10 h-6 rounded-full transition-colors ${showToolCalls ? 'bg-bio-500' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${showToolCalls ? 'translate-x-4' : ''}`} />
            </button>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-bio-500 text-white hover:bg-bio-600 
                   transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? '保存中...' : <><Save className="w-4 h-4" /> 保存配置</>}
      </button>
    </div>
  )
}

function SkillManager({ password }) {
  const [showFileManager, setShowFileManager] = useState(false)

  if (showFileManager) {
    return <FileManager password={password} onClose={() => setShowFileManager(false)} />
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 leading-relaxed">
        管理项目的 <code className="text-bio-600 bg-bio-50 px-1 py-0.5 rounded">.claude</code> 目录，
        包括 Skills、CLAUDE.md 等配置文件。
      </p>
      <button
        onClick={() => setShowFileManager(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg 
                   bg-bio-500 text-white hover:bg-bio-600 transition-colors text-sm font-medium"
      >
        <FolderOpen className="w-4 h-4" />
        打开文件管理器
      </button>
    </div>
  )
}

export default function ConfigPanel({ config, authed, onAuth, onClose, onConfigUpdate }) {
  const [password, setPassword] = useState('')
  const [isAuthed, setIsAuthed] = useState(authed)
  const [tab, setTab] = useState('agent')
  const [fullConfig, setFullConfig] = useState(null)

  const handleAuth = async (pwd) => {
    setPassword(pwd)
    setIsAuthed(true)
    onAuth()
    // Load full config
    try {
      const res = await fetch('/api/config/full', {
        headers: { 'x-auth-password': pwd }
      })
      const data = await res.json()
      setFullConfig(data)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">⚙️ 设置</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-64px)]">
          {!isAuthed ? (
            <PasswordGate onAuth={handleAuth} onClose={onClose} />
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTab('agent')}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${
                    tab === 'agent' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Agent 配置
                </button>
                <button
                  onClick={() => setTab('skills')}
                  className={`flex-1 py-2 text-sm rounded-md transition-all ${
                    tab === 'skills' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Skill 管理
                </button>
              </div>

              {tab === 'agent' && (
                <AgentConfig
                  config={fullConfig || config}
                  password={password}
                  onUpdate={onConfigUpdate}
                />
              )}
              {tab === 'skills' && <SkillManager password={password} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
