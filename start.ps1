# PowerShell 启动脚本
# 用于同时启动前端和后端服务

Write-Host "🚀 正在启动差旅和费用管理系统..." -ForegroundColor Green
Write-Host ""

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未检测到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查依赖是否已安装
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 检测到后端依赖未安装，正在安装..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 检测到前端依赖未安装，正在安装..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "🔧 启动服务..." -ForegroundColor Cyan
Write-Host ""

# 启动后端服务
Write-Host "📡 启动后端服务 (端口 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm run dev" -WindowStyle Normal

# 等待2秒
Start-Sleep -Seconds 2

# 启动前端服务
Write-Host "🌐 启动前端服务 (端口 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ 服务启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📱 前端应用: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📡 后端API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示: 两个服务窗口已打开，关闭窗口即可停止服务" -ForegroundColor Yellow
Write-Host ""






