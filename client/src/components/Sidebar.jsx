import { useState, useEffect, useRef } from 'react'
import { Plus, MessageSquare, Trash2, Menu, Settings, ChevronLeft } from 'lucide-react'

export default function Sidebar({ 
  sessions, currentSessionId, 
  onNewChat, onSelectSession, onDeleteSession, 
  onOpenSettings, collapsed, onToggleCollapse 
}) {
  const [hoveredId, setHoveredId] = useState(null)

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) return '今天'
    if (diff < 172800000) return '昨天'
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // Group sessions by date
  const grouped = {}
  for (const s of sessions) {
    const label = formatDate(s.updatedAt || s.createdAt)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(s)
  }

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggleCollapse}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-40 bg-white/95 backdrop-blur-md border-r border-bio-100/50
        flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? '-translate-x-full md:translate-x-0 md:w-0 md:border-0' : 'translate-x-0 w-72'}
      `}>
        {!collapsed && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-bio-100/30">
              <button
                onClick={onNewChat}
                className="flex items-center gap-2 px-3 py-2 rounded-lg
                           bg-bio-50 hover:bg-bio-100 text-bio-700 
                           transition-colors text-sm font-medium flex-1 mr-2"
              >
                <Plus className="w-4 h-4" />
                <span>新对话</span>
              </button>
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
              {Object.entries(grouped).map(([label, items]) => (
                <div key={label}>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                  </div>
                  {items.map(session => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm
                                  transition-all duration-150 group relative
                                  ${currentSessionId === session.id
                                    ? 'bg-bio-50 text-bio-800 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                      <span className="truncate flex-1">{session.title}</span>
                      {hoveredId === session.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id) }}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-8">
                  暂无对话记录
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-bio-100/30 px-3 py-2">
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                           text-gray-500 hover:bg-gray-50 hover:text-gray-700
                           transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>设置</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Collapsed toggle button */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-30 p-2.5 rounded-full 
                     bg-white/80 backdrop-blur border border-bio-200/40 shadow-sm
                     hover:bg-bio-50 hover:border-bio-300 transition-all duration-200
                     text-gray-500 hover:text-bio-600"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
    </>
  )
}
