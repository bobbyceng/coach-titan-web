#!/usr/bin/env bash
set -euo pipefail

echo "[iOS preflight] checking local toolchain..."

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "❌ xcodebuild 不可用：请安装完整 Xcode（不是仅 CommandLineTools）"
  exit 1
fi

DEV_DIR="$(xcode-select -p 2>/dev/null || true)"
if [[ "$DEV_DIR" == "/Library/Developer/CommandLineTools" ]]; then
  echo "❌ 当前 xcode-select 指向 CommandLineTools：$DEV_DIR"
  echo "   请执行：sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

echo "✅ xcode-select: ${DEV_DIR:-unknown}"

if command -v xcodebuild >/dev/null 2>&1; then
  XCODE_VER="$(xcodebuild -version | tr '\n' ' ' | sed 's/  */ /g')"
  echo "✅ $XCODE_VER"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm 不可用"
  exit 1
fi

echo "✅ preflight 通过，可继续 npm run ios"
