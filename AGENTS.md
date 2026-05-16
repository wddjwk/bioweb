# AGENTS.md - BioWeb 项目开发指南

## 项目概述

BioWeb 是一个面向生物园艺领域的文献检索聊天服务。它提供类似 Gemini 的网页交互界面，后端通过调用 Claude/Copilot/Qoder 等 CLI 工具实现 AI 对话，支持 SSE 流式响应和 Markdown 渲染。

**核心定位：** 本项目仅服务于生物学、植物科学、园艺等相关领域的文献检索与知识问答。非相关领域问题应被拒绝回答。

## 项目结构

```
bioweb/
├── server/                  # 后端 Node.js + Express
│   ├── index.js             # 服务入口
│   ├── agents/              # Agent 调度层
│   │   ├── base.js          # BaseAgent 基类 (spawn, stream, abort)
│   │   ├── claude.js        # Claude CLI Agent (stream-json, --resume)
│   │   ├── copilot.js       # Copilot CLI Agent (plain text, --resume)
│   │   ├── qoder.js         # Qoder CLI Agent
│   │   └── index.js         # Agent 工厂 (createAgent)
│   ├── routes/              # API 路由
│   │   ├── chat.js          # SSE 流式聊天 (POST /api/chat)
│   │   ├── config.js        # 配置 CRUD (GET/PUT /api/config)
│   │   ├── sessions.js      # 会话管理 (CRUD /api/sessions)
│   │   ├── skills.js        # Skill 管理 (CRUD /api/skills)
│   │   └── files.js         # 文件管理 (CRUD /api/files)
│   ├── config/
│   │   └── settings.json    # 默认配置
│   └── data/
│       └── sessions/        # 会话持久化存储 (JSON 文件)
├── client/                  # 前端 React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx          # 根组件 (侧边栏 + 聊天 + 配置)
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Gemini 风格可折叠侧边栏
│   │   │   ├── ChatView.jsx      # 聊天主视图 + 会话/--resume 管理
│   │   │   ├── ChatInput.jsx     # Gemini 风格输入框
│   │   │   ├── ChatMessage.jsx   # 消息渲染 (Markdown + 思考 + 工具)
│   │   │   ├── ConfigPanel.jsx   # 密码认证 + Agent/Skill 配置
│   │   │   ├── FileManager.jsx   # 全屏文件管理器 (.claude 目录)
│   │   │   └── FlowerDecorations.jsx  # 植物装饰 (藤蔓 + 山茶花)
│   │   └── index.css        # 全局样式 + Markdown 渲染
│   └── dist/                # 构建产物
├── .claude/
│   ├── CLAUDE.md            # Claude 项目指引 (bio-scope)
│   └── skills/              # 本地 Skills
│       └── academic-search/ # 文献检索 Skill (v2.0.0)
├── .github/
│   └── copilot-instructions.md  # Copilot 指引
├── manager.sh               # 服务管理脚本 (start/stop/restart/status -p PORT)
├── AGENTS.md                # 本文件
└── package.json             # 项目配置
```

## 架构设计

### Agent 调度层

```
用户输入 → ChatView → POST /api/chat → AgentFactory → CLI spawn → SSE stream → 前端渲染
```

- **BaseAgent**: 提供 `execute(prompt, options)` 方法，通过 `child_process.spawn` 调用 CLI
- **关键修复**: SSE 中必须监听 `res.on('close')` 而非 `req.on('close')`，否则 Express 中间件消费请求体后会立即触发 close
- **--resume**: 支持通过 `resumeSessionId` 参数继续已有 CLI 会话

### 新增 Agent 指南

1. 在 `server/agents/` 创建新 Agent 类，继承 `BaseAgent`
2. 实现 `buildCommand(prompt, options)` 返回 `{ command, args, env }`
3. 如果 CLI 输出非 NDJSON，覆盖 `parseLine(line)` 方法
4. 如果需要标准化事件格式，覆盖 `normalizeEvent(event)` 方法
5. 在 `server/agents/index.js` 注册
6. 在 `server/config/settings.json` 添加默认配置

### 会话管理

- 每个网页会话对应一个 `session.id`（UUID）
- 首次对话时自动创建 session，标题取自第一条消息前30字
- `agentSessionId` 记录 CLI 工具的 session ID，用于 `--resume` 多轮对话
- 会话数据以 JSON 文件持久化在 `server/data/sessions/`
- 侧边栏展示历史会话，支持新建/切换/删除

### 配置管理

- 密码认证 (`121212`) 保护配置修改
- 配置保存使用深合并 (deep merge)，更新 model 不会丢失 command/extraArgs
- 支持切换 activeAgent (claude/copilot/qoder) 和各自的模型

### 文件管理器

- 通过 设置 → Skill 管理 → 打开文件管理器 进入
- 全屏界面管理 `.claude` 目录下的文件
- 支持：浏览目录、面包屑导航、新建文件/文件夹、删除、在线编辑 (Ctrl+S 保存)
- 后端路径安全校验，防止路径穿越

### 前端架构

- **Sidebar**: 可折叠侧边栏，展示历史会话，移动端自动收起
- **ChatView**: 核心聊天逻辑，SSE 流解析，会话状态管理
- **ConfigPanel**: 密码认证后可切换 Agent、修改模型、进入文件管理器
- **FlowerDecorations**: 右上角藤蔓+小花装饰，右下角山茶花，不遮挡正文

## 开发说明

### 启动开发环境

```bash
npm install --registry=https://registry.npmmirror.com
cd client && npm install --registry=https://registry.npmmirror.com && cd ..
npm run dev          # 后端 (端口 3000)
cd client && npm run dev  # 前端 (端口 5173，代理到 3000)
```

### 生产部署

```bash
./manager.sh start            # 默认端口 3000
./manager.sh start -p 8080    # 指定端口
./manager.sh status           # 查看状态
./manager.sh restart -p 3001  # 重启到新端口
./manager.sh stop             # 停止
```

### 配置项

- 密码: `121212`（config 面板访问密码）
- 默认 Agent: `claude`
- 模型配置: 通过配置面板可视化修改

## Skill 开发

Skills 存放在 `.claude/skills/` 目录，每个 Skill 包含一个 `SKILL.md`。通过文件管理器可在线编辑。

当前已有:
- `academic-search`: 学术文献检索 v2.0.0（支持 PubMed, Semantic Scholar, OpenAlex, CrossRef 等，纯 curl API 驱动，无需浏览器/密钥）
