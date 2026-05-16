import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  X, Folder, FileText, ChevronRight, ArrowLeft, Plus, 
  FolderPlus, Save, Trash2, Edit3, File, Home
} from 'lucide-react'

export default function FileManager({ password, onClose }) {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [editingFile, setEditingFile] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(null) // 'file' | 'folder' | null
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const editorRef = useRef(null)

  const headers = { 'x-auth-password': password }

  const loadDir = useCallback(async (dirPath = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`, { headers })
      const data = await res.json()
      if (data.entries) {
        setEntries(data.entries)
        setCurrentPath(dirPath)
      }
    } catch {}
    setLoading(false)
  }, [password])

  useEffect(() => { loadDir('') }, [loadDir])

  const openFile = async (filePath) => {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`, { headers })
      const data = await res.json()
      setEditingFile(filePath)
      setEditContent(data.content || '')
      setDirty(false)
    } catch {}
  }

  const saveFile = async () => {
    if (!editingFile) return
    setSaving(true)
    try {
      await fetch('/api/files/write', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: editingFile, content: editContent })
      })
      setDirty(false)
    } catch {}
    setSaving(false)
  }

  const createEntry = async () => {
    if (!newName.trim()) return
    const entryPath = currentPath ? `${currentPath}/${newName.trim()}` : newName.trim()
    try {
      await fetch('/api/files/create', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entryPath, isDirectory: showNewDialog === 'folder' })
      })
      setNewName('')
      setShowNewDialog(null)
      loadDir(currentPath)
    } catch {}
  }

  const deleteEntry = async (entryPath, name) => {
    if (!confirm(`确定删除 "${name}" 吗？此操作不可撤销。`)) return
    try {
      await fetch(`/api/files?path=${encodeURIComponent(entryPath)}`, {
        method: 'DELETE',
        headers
      })
      loadDir(currentPath)
    } catch {}
  }

  const navigateUp = () => {
    if (!currentPath) return
    const parent = currentPath.split('/').slice(0, -1).join('/')
    loadDir(parent)
  }

  const breadcrumbs = ['根目录', ...currentPath.split('/').filter(Boolean)]

  const handleKeyDown = (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      saveFile()
    }
  }

  const getFileIcon = (name) => {
    if (name.endsWith('.md')) return '📝'
    if (name.endsWith('.json')) return '📋'
    if (name.endsWith('.sh')) return '⚙️'
    if (name.endsWith('.js') || name.endsWith('.py')) return '💻'
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-bio-50 to-white border-b border-bio-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bio-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            <Folder className="w-5 h-5 text-bio-600" />
            <h2 className="text-lg font-semibold text-gray-800">.claude 文件管理</h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {editingFile ? (
        /* File Editor */
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (dirty && !confirm('有未保存的更改，确定离开？')) return
                  setEditingFile(null)
                  setDirty(false)
                }}
                className="text-sm text-bio-600 hover:text-bio-700 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 返回
              </button>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600 font-mono">{editingFile}</span>
              {dirty && <span className="text-xs text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">未保存</span>}
            </div>
            <button
              onClick={saveFile}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-bio-500 text-white text-sm
                         hover:bg-bio-600 transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '保存中...' : '保存 (Ctrl+S)'}
            </button>
          </div>
          <textarea
            ref={editorRef}
            value={editContent}
            onChange={(e) => { setEditContent(e.target.value); setDirty(true) }}
            onKeyDown={handleKeyDown}
            className="flex-1 p-4 font-mono text-sm leading-relaxed resize-none outline-none
                       bg-white text-gray-800 border-t border-gray-100 selection:bg-bio-200/50"
            spellCheck={false}
            autoFocus
          />
        </div>
      ) : (
        /* Directory Browser */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80 border-b">
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <button 
                onClick={() => loadDir('')} 
                className="text-bio-600 hover:text-bio-700 flex-shrink-0"
              >
                <Home className="w-4 h-4" />
              </button>
              {currentPath && currentPath.split('/').filter(Boolean).map((part, i, arr) => {
                const partPath = arr.slice(0, i + 1).join('/')
                return (
                  <span key={i} className="flex items-center gap-1 flex-shrink-0">
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <button
                      onClick={() => loadDir(partPath)}
                      className="text-bio-600 hover:text-bio-700 hover:underline"
                    >
                      {part}
                    </button>
                  </span>
                )
              })}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <button
                onClick={() => { setShowNewDialog('file'); setNewName('') }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md 
                           bg-white border border-gray-200 text-gray-600
                           hover:bg-bio-50 hover:border-bio-300 hover:text-bio-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> 新建文件
              </button>
              <button
                onClick={() => { setShowNewDialog('folder'); setNewName('') }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md 
                           bg-white border border-gray-200 text-gray-600
                           hover:bg-bio-50 hover:border-bio-300 hover:text-bio-700 transition-colors"
              >
                <FolderPlus className="w-3 h-3" /> 新建文件夹
              </button>
            </div>
          </div>

          {/* New entry dialog */}
          {showNewDialog && (
            <div className="px-4 py-3 bg-bio-50/50 border-b flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {showNewDialog === 'folder' ? '📁' : '📄'} 新建{showNewDialog === 'folder' ? '文件夹' : '文件'}:
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createEntry()}
                placeholder={showNewDialog === 'folder' ? 'folder-name' : 'filename.md'}
                className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded-md border border-gray-200 
                           outline-none focus:border-bio-400 focus:ring-1 focus:ring-bio-200"
                autoFocus
              />
              <button onClick={createEntry} className="px-3 py-1.5 text-sm bg-bio-500 text-white rounded-md hover:bg-bio-600">
                创建
              </button>
              <button onClick={() => setShowNewDialog(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                取消
              </button>
            </div>
          )}

          {/* Go up */}
          {currentPath && (
            <button
              onClick={navigateUp}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-500 border-b border-gray-100/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回上级</span>
            </button>
          )}

          {/* File list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-bio-300 border-t-transparent rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                空目录
              </div>
            ) : (
              entries.map((entry) => (
                <div 
                  key={entry.path}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 
                             transition-colors border-b border-gray-100/50 group cursor-pointer"
                  onClick={() => entry.isDirectory ? loadDir(entry.path) : openFile(entry.path)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {entry.isDirectory ? (
                      <Folder className="w-5 h-5 text-bio-500 flex-shrink-0" />
                    ) : (
                      <span className="flex-shrink-0 text-base">
                        {getFileIcon(entry.name) || <FileText className="w-5 h-5 text-gray-400" />}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">{entry.name}</div>
                      <div className="text-xs text-gray-400">
                        {entry.isDirectory ? '文件夹' : formatSize(entry.size)}
                        {' · '}
                        {new Date(entry.modified).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!entry.isDirectory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openFile(entry.path) }}
                        className="p-2 rounded-md hover:bg-bio-100 text-bio-600"
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.path, entry.name) }}
                      className="p-2 rounded-md hover:bg-red-50 text-red-400"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
