# ============================================================
# 🤡 FakeAI — Vercel 一键部署脚本 (PowerShell)
# ============================================================

param (
    [switch]$Preview
)

Write-Host "🚀 准备部署 FakeAI 到 Vercel..." -ForegroundColor Cyan

# 检查 vercel CLI 是否可用
$hasVercel = Get-Command vercel -ErrorAction SilentlyContinue

if ($hasVercel) {
    $VercelCmd = "vercel"
} else {
    Write-Host "📦 未检测到全局 vercel CLI，将通过 npx vercel 运行..." -ForegroundColor Yellow
    $VercelCmd = "npx vercel"
}

if ($Preview) {
    Write-Host "⚡ 正在部署到 [Preview 预览环境]..." -ForegroundColor Yellow
    Invoke-Expression "$VercelCmd"
} else {
    Write-Host "🌟 正在部署到 [Production 生产环境]..." -ForegroundColor Green
    Invoke-Expression "$VercelCmd --prod"
}

Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "👉 管理后台入口: https://<your-project>.vercel.app/vx/mg.html" -ForegroundColor Cyan
