#!/bin/zsh
#
# 建设银行流水 → 随手记 —— 双击启动
#
# 双击本文件即可启动应用：自动定位 node、必要时安装依赖、挑一个空闲端口、
# 起本地服务并打开浏览器。关闭终端窗口或按 Ctrl+C 即停止服务。
#
# 注意：本文件通过 Terminal 执行时是非交互 shell，不会加载 ~/.zshrc，
# 因此不能依赖 PATH 里的 node，必须自行探测。

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/web-app"
DEFAULT_PORT=5173

say() { printf '%s\n' "$1"; }
rule() { printf '%s\n' "------------------------------------------------------------"; }

rule
say "建设银行流水 → 随手记"
rule

cd "$APP_DIR" 2>/dev/null || {
  say ""
  say "✗ 找不到应用目录：$APP_DIR"
  say "  请确认本文件和 web-app/ 在同一个仓库根目录下。"
  say ""
  say "按回车键关闭..."
  read -r _
  exit 1
}

# ---------------------------------------------------------------------------
# 1. 查找 node
# ---------------------------------------------------------------------------
say ""
say "▸ 正在查找 Node.js..."

find_node() {
  local -a candidates
  candidates=()
  command -v node >/dev/null 2>&1 && candidates+=("$(command -v node)")
  candidates+=(
    "$HOME/.local/bin/node"
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "$HOME/.workbuddy/binaries/node/versions/22.22.2-3/bin/node"
    "$HOME/.nvm/versions/node/current/bin/node"
  )
  local c
  for c in "${candidates[@]}"; do
    [ -n "$c" ] && [ -x "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}

NODE="$(find_node || true)"

if [ -z "$NODE" ]; then
  say "✗ 没有找到 Node.js。"
  say ""
  say "  请先安装 Node.js（建议 LTS 版本）：https://nodejs.org"
  say "  安装后重新双击本文件即可。"
  say ""
  say "按回车键关闭..."
  read -r _
  exit 1
fi

NODE_VERSION="$("$NODE" -v 2>/dev/null)"
say "  ✓ $NODE ($NODE_VERSION)"

# npm 优先取 node 同目录的版本，避免混用另一个 node 版本的 npm
if [ -x "$(dirname "$NODE")/npm" ]; then
  NPM="$(dirname "$NODE")/npm"
else
  NPM="$(command -v npm 2>/dev/null || true)"
fi

if [ -z "$NPM" ]; then
  say "✗ 找到了 Node.js 但没找到 npm。两者通常一起安装，请重新安装 Node.js。"
  say ""
  say "按回车键关闭..."
  read -r _
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. 依赖检查
# ---------------------------------------------------------------------------
say ""
if [ ! -d "$APP_DIR/node_modules" ]; then
  say "▸ 首次运行，正在安装依赖（约 1 分钟，请稍候）..."
  "$NPM" install || {
    say "✗ 依赖安装失败，请检查网络后重试。"
    say ""
    say "按回车键关闭..."
    read -r _
    exit 1
  }
  say "  ✓ 依赖安装完成"
else
  say "▸ 依赖已就绪"
fi

if [ ! -f "$APP_DIR/node_modules/vite/bin/vite.js" ]; then
  say ""
  say "✗ 依赖不完整（缺少 vite），正在重新安装..."
  "$NPM" install || {
    say "✗ 依赖安装失败，请检查网络后重试。"
    say ""
    say "按回车键关闭..."
    read -r _
    exit 1
  }
fi

# ---------------------------------------------------------------------------
# 3. 选择空闲端口
# ---------------------------------------------------------------------------
port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

PORT=$DEFAULT_PORT
while port_in_use "$PORT"; do
  PORT=$((PORT + 1))
done

if [ "$PORT" -ne "$DEFAULT_PORT" ]; then
  say ""
  say "▸ 默认端口 $DEFAULT_PORT 已被占用，改用 $PORT"
fi

# ---------------------------------------------------------------------------
# 4. 启动服务
# ---------------------------------------------------------------------------
URL="http://localhost:$PORT/"
say ""
say "▸ 正在启动服务：$URL"
say ""

"$NODE" "$APP_DIR/node_modules/vite/bin/vite.js" --port "$PORT" &
SERVER_PID=$!

cleanup() {
  say ""
  say "正在停止服务..."
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  say "已停止。可以关闭本窗口。"
  exit 0
}
trap cleanup INT TERM

# 等待服务就绪（最多 30 秒）
READY=0
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$URL" 2>/dev/null; then
    READY=1
    break
  fi
  kill -0 "$SERVER_PID" 2>/dev/null || break
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  say "✗ 服务启动失败。上面的日志是失败原因。"
  say ""
  say "按回车键关闭..."
  read -r _
  cleanup
fi

open "$URL"
say "  ✓ 已在浏览器中打开 $URL"
say ""
say "============================================================"
say "服务运行中。改代码会自动热更新，无需重新启动。"
say ""
say "停止服务：在本窗口按 Ctrl + C，或直接关闭窗口。"
say "============================================================"
say ""

wait "$SERVER_PID"
