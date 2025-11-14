@echo off
echo ========================================
echo 启动项目
echo ========================================
echo.

echo [1/2] 启动后端服务器...
start "Backend Server" cmd /k "cd /d %~dp0OA-main\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务器...
start "Frontend Server" cmd /k "cd /d %~dp0OA-main\frontend && npm start"

echo.
echo ========================================
echo 项目启动中...
echo ========================================
echo.
echo 后端服务器: http://localhost:3001
echo 前端服务器: http://localhost:3000
echo.
echo 服务器将在新窗口中启动
echo 请查看窗口中的日志确认启动状态
echo.
timeout /t 3 /nobreak >nul

