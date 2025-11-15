#!/bin/bash

# ==========================================
# 服务器端部署脚本
# 在服务器上执行：安装依赖、构建前端、重启服务
# 使用方法: 将此脚本上传到服务器后执行
# ==========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本所在目录（部署路径）
DEPLOY_PATH=$(cd "$(dirname "$0")" && pwd)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 开始部署应用${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "📍 部署路径: $DEPLOY_PATH"
echo ""

# 确保在正确的目录
cd "$DEPLOY_PATH"

# 确保目录权限正确
chmod -R 755 backend frontend 2>/dev/null || true

# 0. 检查并安装 Node.js 和 npm
echo -e "${YELLOW}[步骤 0/5] 检查 Node.js 环境...${NC}"

if ! command -v node &> /dev/null; then
    echo "   Node.js 未安装，开始安装..."
    echo "   使用 nvm 安装 Node.js 18..."
    
    # 检查是否安装了 nvm
    if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
        echo "   安装 nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    fi
    
    # 加载 nvm（多次尝试以确保加载成功）
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
    
    # 再次尝试加载 nvm
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # 验证 nvm 是否可用
    if ! command -v nvm &> /dev/null && ! type nvm &> /dev/null; then
        echo "   ⚠️  nvm 加载失败，尝试手动加载..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # 安装 Node.js 18
    echo "   安装 Node.js 18..."
    bash -c 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm install 18 && nvm use 18 && nvm alias default 18'
    
    # 再次加载 nvm 以确保 node 和 npm 可用
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    export PATH="$NVM_DIR/versions/node/$(nvm version 18)/bin:$PATH"
    
    echo -e "${GREEN}✅ Node.js 安装完成${NC}"
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 已安装: $NODE_VERSION${NC}"
fi

if ! command -v npm &> /dev/null; then
    # 尝试加载 nvm 并添加到 PATH
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    # 如果 nvm 已安装但未加载，手动添加 Node.js 到 PATH
    if [ -d "$NVM_DIR/versions/node" ]; then
        NODE_VERSION_DIR=$(ls -t "$NVM_DIR/versions/node" | head -1)
        if [ -n "$NODE_VERSION_DIR" ]; then
            export PATH="$NVM_DIR/versions/node/$NODE_VERSION_DIR/bin:$PATH"
        fi
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ 错误: npm 未找到，即使 Node.js 已安装${NC}"
        exit 1
    fi
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm 已安装: $NPM_VERSION${NC}"

# 确保后续步骤能使用 node 和 npm（设置 PATH）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# 如果使用 nvm，确保 Node.js 在 PATH 中
if [ -d "$NVM_DIR/versions/node" ]; then
    NODE_VERSION_DIR=$(ls -t "$NVM_DIR/versions/node" | head -1)
    if [ -n "$NODE_VERSION_DIR" ]; then
        export PATH="$NVM_DIR/versions/node/$NODE_VERSION_DIR/bin:$PATH"
    fi
fi

echo ""

# 1. 安装前端依赖
echo -e "${YELLOW}[步骤 1/5] 安装前端依赖...${NC}"
cd frontend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 未找到 frontend/package.json${NC}"
    exit 1
fi

echo "   正在安装依赖（这可能需要几分钟）..."
echo "   📦 开始 npm install..."
# 使用后台进程显示进度点，让用户知道脚本还在运行
(
    while true; do
        echo -n "."
        sleep 2
    done
) &
PROGRESS_PID=$!

# 执行npm install，显示警告和错误，隐藏正常进度信息
npm install --progress=false --loglevel=warn 2>&1
NPM_EXIT_CODE=$?

# 停止进度指示器
kill $PROGRESS_PID 2>/dev/null || true
echo ""  # 换行

if [ $NPM_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ 前端依赖安装失败 (退出代码: $NPM_EXIT_CODE)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 前端依赖安装完成${NC}"

# 2. 构建前端（如果build目录不存在）
echo ""
echo -e "${YELLOW}[步骤 2/5] 检查前端构建...${NC}"

if [ -d "build" ] && [ -f "build/index.html" ]; then
    echo -e "${GREEN}✅ 检测到已构建的前端文件（可能是从本地上传的）${NC}"
    echo "   跳过构建步骤..."
    echo -e "${GREEN}✅ 前端构建文件已存在${NC}"
else
    echo "   未找到构建文件，开始构建..."
    echo "   正在构建（这可能需要较长时间）..."
    
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 前端构建失败${NC}"
        exit 1
    fi
    
    if [ ! -d "build" ]; then
        echo -e "${RED}❌ 构建失败：未找到 build 目录${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 前端构建完成${NC}"
fi

# 移动构建文件到正确位置（server.js 期望的结构）
echo ""
echo -e "${YELLOW}   移动构建文件到正确位置...${NC}"

# server.js 期望前端文件在 frontend/ 目录下（与 backend/ 同级）
# 构建输出在 frontend/build/ 目录，需要移动构建内容到 frontend/ 根目录
if [ -d "build" ]; then
    # 备份旧的构建文件（如果存在且不是 build 目录）
    if [ -f "index.html" ] && [ ! -d "index.html" ] && [ ! -f "index.html.bak" ]; then
        mv index.html index.html.bak 2>/dev/null || true
        echo "   ✅ 已备份旧的 index.html"
    fi
    if [ -d "static" ] && [ ! -d "build/static" ]; then
        mv static static.bak 2>/dev/null || true
        echo "   ✅ 已备份旧的 static 目录"
    fi
    
    # 复制构建文件内容到 frontend 根目录
    cp -r build/* . 2>/dev/null || true
    
    # 验证 index.html 是否存在
    if [ -f "index.html" ]; then
        echo -e "${GREEN}   ✅ 构建文件已移动到正确位置${NC}"
    else
        echo -e "${YELLOW}   ⚠️  警告: index.html 未找到，请检查构建输出${NC}"
    fi
fi

cd ..

# 3. 安装后端依赖
echo ""
echo -e "${YELLOW}[步骤 3/5] 安装后端依赖...${NC}"
cd backend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 未找到 backend/package.json${NC}"
    exit 1
fi

echo "   正在安装生产环境依赖（这可能需要几分钟）..."
echo "   📦 开始 npm install --production..."
# 使用后台进程显示进度点
(
    while true; do
        echo -n "."
        sleep 2
    done
) &
PROGRESS_PID=$!

# 执行npm install，显示警告和错误
npm install --production --progress=false --loglevel=warn 2>&1
NPM_EXIT_CODE=$?

# 停止进度指示器
kill $PROGRESS_PID 2>/dev/null || true
echo ""  # 换行

if [ $NPM_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ 后端依赖安装失败 (退出代码: $NPM_EXIT_CODE)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
cd ..

# 4. 重启服务
echo ""
echo -e "${YELLOW}[步骤 4/5] 重启服务...${NC}"

# 检查 PM2 是否已安装
if command -v pm2 &> /dev/null; then
    echo "   使用 PM2 重启服务..."
    pm2 restart oa-backend 2>/dev/null || pm2 start backend/server.js --name oa-backend
    pm2 save 2>/dev/null || true
    echo -e "${GREEN}✅ PM2 服务已重启${NC}"
    echo ""
    echo "   服务状态："
    pm2 list | grep oa-backend || echo "   未找到 oa-backend 进程"
else
    echo -e "${YELLOW}   PM2 未安装，尝试安装...${NC}"
    # 尝试使用 sudo 安装 PM2
    if sudo npm install -g pm2 2>&1 | grep -q "pm2@"; then
        echo -e "${GREEN}   PM2 安装成功${NC}"
        echo "   启动服务..."
        pm2 start backend/server.js --name oa-backend || pm2 restart oa-backend
        pm2 save 2>/dev/null || true
        echo -e "${GREEN}✅ PM2 服务已启动${NC}"
    else
        echo -e "${YELLOW}   ⚠️  PM2 安装失败，使用 npm start 启动服务...${NC}"
        cd backend
        # 停止旧进程
        pkill -f 'node.*server.js' 2>/dev/null || true
        sleep 2
        # 启动新进程
        nohup npm start > /tmp/oa-backend.log 2>&1 &
        sleep 3
        if pgrep -f 'node.*server.js' > /dev/null; then
            echo -e "${GREEN}   ✅ 服务已在后台启动${NC}"
            echo "   日志文件: /tmp/oa-backend.log"
            echo "   查看日志: tail -f /tmp/oa-backend.log"
        else
            echo -e "${RED}   ❌ 服务启动失败，请检查日志: /tmp/oa-backend.log${NC}"
        fi
        echo -e "${YELLOW}   ⚠️  建议稍后手动安装 PM2: sudo npm install -g pm2${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 服务信息："
echo "   - 部署路径: $DEPLOY_PATH"
echo "   - 前端构建: frontend/index.html"
echo "   - 后端服务: backend/server.js"
echo ""
echo "🔍 查看服务状态："
echo "   pm2 list              # 查看 PM2 进程"
echo "   pm2 logs oa-backend    # 查看日志"
echo "   pm2 monit              # 监控面板"
echo ""


