#!/usr/bin/env bash
# ============================================================
# 🤡 FakeAI — Vercel 一键部署脚本 (Bash)
# ============================================================

set -e

echo "🚀 准备部署 FakeAI 到 Vercel..."

# 检查是否安装了 vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 未检测到全局 vercel CLI，正在通过 npx 运行..."
    VERCEL_CMD="npx vercel"
else
    VERCEL_CMD="vercel"
fi

# 参数检查：默认生产环境部署，加 --preview 可部署预览环境
if [ "$1" == "--preview" ]; then
    echo "⚡ 正在部署到 [Preview 预览环境]..."
    $VERCEL_CMD
else
    echo "🌟 正在部署到 [Production 生产环境]..."
    $VERCEL_CMD --prod
fi

echo ""
echo "🎉 部署完成！"
echo "👉 管理后台入口: https://<your-project>.vercel.app/vx/mg.html"
