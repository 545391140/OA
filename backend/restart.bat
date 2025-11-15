@echo off
echo ========================================
echo 重启后端服务器
echo ========================================
echo.

echo [1/3] 正在停止现有服务器进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo [2/3] 检查配置...
if exist .env (
    echo ✓ 找到 .env 文件
) else (
    echo ⚠ 未找到 .env 文件，请确保已配置 MISTRAL_API_KEY
)
echo.

echo [3/3] 正在启动服务器...
echo.
echo 服务器将在新窗口中启动...
echo 按任意键继续...
pause >nul

start "Backend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo 服务器启动中...
echo 请查看新窗口中的日志
echo ========================================
timeout /t 3 /nobreak >nul


