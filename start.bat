@echo off
chcp 65001 >nul
echo 🚀 正在启动差旅和费用管理系统...
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

REM 检查依赖是否已安装
if not exist "backend\node_modules" (
    echo 📦 检测到后端依赖未安装，正在安装...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo 📦 检测到前端依赖未安装，正在安装...
    cd frontend
    call npm install
    cd ..
)

echo.
echo 🔧 启动服务...
echo.

REM 启动后端服务
echo 📡 启动后端服务 (端口 3001)...
start "后端服务" cmd /k "cd backend && npm run dev"

REM 等待2秒
timeout /t 2 /nobreak >nul

REM 启动前端服务
echo 🌐 启动前端服务 (端口 3000)...
start "前端服务" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ 服务启动完成！
echo.
echo 📱 前端应用: http://localhost:3000
echo 📡 后端API: http://localhost:3001
echo.
echo 💡 提示: 两个服务窗口已打开，关闭窗口即可停止服务
echo.
pause





