# 重启服务器指南

## 重启步骤

### 1. 停止当前服务器

**方法1：如果服务器在终端中运行**
- 按 `Ctrl + C` 停止服务器

**方法2：如果服务器在后台运行**
```powershell
# 查找占用3001端口的进程
netstat -ano | findstr :3001

# 停止进程（替换PID为实际的进程ID）
taskkill /PID <PID> /F
```

**方法3：停止所有Node进程（谨慎使用）**
```powershell
taskkill /F /IM node.exe
```

### 2. 确认配置已保存

如果配置了 `MISTRAL_API_KEY`，请确认：
- ✅ `backend/.env` 文件已保存
- ✅ 或 `backend/config.js` 已更新

### 3. 启动服务器

**开发模式（推荐，自动重启）：**
```bash
cd backend
npm run dev
```

**生产模式：**
```bash
cd backend
npm start
```

### 4. 验证启动

启动后应该看到：
```
========================================
初始化 Mistral AI 客户端...
✓ @mistralai/mistralai 包加载成功
config.MISTRAL_API_KEY: 已配置 (sk-xxxxx...)
✓ Mistral AI 客户端初始化成功
✓ Mistral OCR API 可用
========================================
```

如果看到 "✗ Mistral API Key 未配置"，请检查配置。

## 快速重启脚本

创建 `restart.bat` 文件（Windows）：
```batch
@echo off
echo 正在停止服务器...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *server.js*" 2>nul
timeout /t 2 /nobreak >nul
echo 正在启动服务器...
cd backend
start "Backend Server" cmd /k "npm run dev"
```

然后双击运行 `restart.bat`。


