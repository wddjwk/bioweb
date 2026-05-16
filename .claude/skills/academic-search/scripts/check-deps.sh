#!/usr/bin/env bash
# academic-search: 环境检查（纯 API 模式，无需 Chrome/CDP）

echo "=== academic-search 环境检查 ==="

# curl 检查（API 调用必需）
if command -v curl &>/dev/null; then
  CURL_VER=$(curl --version 2>/dev/null | head -1 | awk '{print $2}')
  echo "✅ curl: ok ($CURL_VER)"
else
  echo "❌ curl: missing — 请安装 curl（API 调用必需）"
  exit 1
fi

# Node.js 检查（仅 OA PDF 下载脚本需要，纯搜索可不装）
if command -v node &>/dev/null; then
  NODE_VER=$(node --version 2>/dev/null)
  echo "✅ node: ok ($NODE_VER) — OA PDF 批量下载可用"
else
  echo "ℹ️  node: 未安装 — 纯搜索不受影响；如需 OA PDF 批量下载请安装 Node.js"
fi

# 可选：检查 S2 API Key
if [ -n "$S2_API_KEY" ]; then
  echo "✅ S2 API Key: 已设置（高速率模式）"
else
  echo "ℹ️  S2 API Key: 未设置（无 Key 可用，速率较低；设置 S2_API_KEY 环境变量可提升）"
fi

# 可选：检查 NCBI API Key
if [ -n "$NCBI_API_KEY" ]; then
  echo "✅ NCBI API Key: 已设置"
else
  echo "ℹ️  NCBI API Key: 未设置（PubMed 无 Key 可用，有 Key 速率更高）"
fi

echo ""
echo "🟢 环境就绪 — 可使用 arXiv、Semantic Scholar、PubMed、OpenAlex、Crossref、Unpaywall、Papers with Code 等全部 API 平台"
