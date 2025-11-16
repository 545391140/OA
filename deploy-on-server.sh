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
echo -e "${YELLOW}[步骤 0/6] 检查 Node.js 环境...${NC}"

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

# 1. 安装前端依赖（检查是否已安装）
echo -e "${YELLOW}[步骤 1/6] 安装前端依赖...${NC}"
cd frontend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 未找到 frontend/package.json${NC}"
    exit 1
fi

# 检查 node_modules 是否存在
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo -e "${GREEN}   ✅ 检测到已安装的前端依赖${NC}"
    echo "   跳过安装步骤..."
    echo -e "${GREEN}✅ 前端依赖已存在${NC}"
else
    echo "   未找到依赖，开始安装..."
    echo "   📦 清理旧的依赖（如果存在）..."
    rm -rf node_modules package-lock.json 2>/dev/null || true

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
fi

# 2. 构建前端（如果build目录不存在）
echo ""
echo -e "${YELLOW}[步骤 2/6] 检查前端构建...${NC}"

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
    if [ -d "static" ] && [ ! -d "static.bak" ]; then
        mv static static.bak 2>/dev/null || true
        echo "   ✅ 已备份旧的 static 目录"
    fi
    
    # 复制构建文件内容到 frontend 根目录
    cp -r build/* . 2>/dev/null || {
        echo -e "${RED}   ❌ 复制构建文件失败${NC}"
        exit 1
    }
    
    # 验证 index.html 是否存在
    if [ -f "index.html" ] && [ -d "static" ]; then
        echo -e "${GREEN}   ✅ 构建文件已移动到正确位置${NC}"
    else
        echo -e "${RED}   ❌ 错误: 构建文件不完整${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}   ⚠️  警告: build 目录不存在，跳过移动步骤${NC}"
fi

cd ..

# 3. 安装系统依赖（Poppler等）
echo ""
echo -e "${YELLOW}[步骤 3/6] 安装系统依赖（Poppler等）...${NC}"

# 检查操作系统类型
if [ -f /etc/redhat-release ]; then
    # CentOS/RHEL/Amazon Linux
    echo "   检测到 RedHat 系列系统，使用 yum 安装..."
    
    # 检查并安装 poppler
    if ! command -v pdftoppm &> /dev/null; then
        echo "   安装 poppler-utils..."
        sudo yum install -y poppler-utils poppler-data 2>/dev/null || {
            echo -e "${YELLOW}   ⚠️  yum 安装失败，尝试使用 dnf...${NC}"
            sudo dnf install -y poppler-utils poppler-data 2>/dev/null || {
                echo -e "${YELLOW}   ⚠️  无法通过包管理器安装 poppler，请手动安装${NC}"
            }
        }
    else
        echo -e "${GREEN}   ✅ Poppler 已安装${NC}"
    fi
    
    # 安装其他可能需要的依赖（检查是否已安装）
    echo "   检查其他系统依赖..."
    MISSING_DEPS=""
    if ! command -v g++ &> /dev/null && ! command -v gcc &> /dev/null; then
        MISSING_DEPS="$MISSING_DEPS gcc-c++"
    fi
    if ! command -v make &> /dev/null; then
        MISSING_DEPS="$MISSING_DEPS make"
    fi
    if ! command -v cmake &> /dev/null; then
        MISSING_DEPS="$MISSING_DEPS cmake"
    fi
    
    if [ -n "$MISSING_DEPS" ]; then
        echo "   安装缺失的依赖: $MISSING_DEPS..."
        sudo yum install -y $MISSING_DEPS 2>/dev/null || sudo dnf install -y $MISSING_DEPS 2>/dev/null || true
    else
        echo -e "${GREEN}   ✅ 所有系统依赖已安装${NC}"
    fi
    
elif [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    echo "   检测到 Debian 系列系统，使用 apt-get 安装..."
    
    # 更新包列表
    sudo apt-get update -qq 2>/dev/null || true
    
    # 检查并安装 poppler
    if ! command -v pdftoppm &> /dev/null; then
        echo "   安装 poppler-utils..."
        sudo apt-get install -y poppler-utils poppler-data 2>/dev/null || {
            echo -e "${YELLOW}   ⚠️  无法通过包管理器安装 poppler，请手动安装${NC}"
        }
    else
        echo -e "${GREEN}   ✅ Poppler 已安装${NC}"
    fi
    
    # 安装其他可能需要的依赖（检查是否已安装）
    echo "   检查其他系统依赖..."
    MISSING_DEPS=""
    if ! command -v g++ &> /dev/null && ! command -v gcc &> /dev/null; then
        MISSING_DEPS="$MISSING_DEPS build-essential"
    fi
    if ! command -v cmake &> /dev/null; then
        MISSING_DEPS="$MISSING_DEPS cmake"
    fi
    
    if [ -n "$MISSING_DEPS" ]; then
        echo "   安装缺失的依赖: $MISSING_DEPS..."
        sudo apt-get install -y $MISSING_DEPS 2>/dev/null || true
    else
        echo -e "${GREEN}   ✅ 所有系统依赖已安装${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  无法识别操作系统类型，跳过系统依赖安装${NC}"
    echo "   请手动安装 poppler-utils"
fi

# 验证 poppler 安装
if command -v pdftoppm &> /dev/null; then
    POPPLER_VERSION=$(pdftoppm -v 2>&1 | head -1 || echo "已安装")
    echo -e "${GREEN}   ✅ Poppler 验证成功: $POPPLER_VERSION${NC}"
else
    echo -e "${YELLOW}   ⚠️  警告: Poppler 未找到，PDF 转图片功能可能不可用${NC}"
    echo "   请手动安装: sudo yum install poppler-utils 或 sudo apt-get install poppler-utils"
fi

echo -e "${GREEN}✅ 系统依赖检查完成${NC}"

# 4. 检查环境变量配置
echo ""
echo -e "${YELLOW}[步骤 4/6] 检查环境变量配置...${NC}"

ENV_FILE="$DEPLOY_PATH/backend/.env"
ENV_EXAMPLE="$DEPLOY_PATH/backend/config.example.js"

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "   ⚠️  .env 文件不存在，创建模板..."
    
    # 从 config.example.js 创建 .env 模板
    cat > "$ENV_FILE" << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/travel-expense-system

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_EXPIRE=7d

# Mistral AI Configuration (必需 - 用于OCR识别)
MISTRAL_API_KEY=your-mistral-api-key-here

# 阿里云 DashScope Configuration (可选 - OCR备用方案)
# DASHSCOPE_API_KEY=your-dashscope-api-key-here

# Email Configuration (可选)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
EOF
    echo -e "${YELLOW}   ✅ 已创建 .env 模板文件${NC}"
    echo -e "${RED}   ⚠️  重要: 请编辑 $ENV_FILE 并配置 MISTRAL_API_KEY${NC}"
else
    echo -e "${GREEN}   ✅ .env 文件已存在${NC}"
fi

# 检查 MISTRAL_API_KEY 是否配置
if [ -f "$ENV_FILE" ]; then
    if grep -q "MISTRAL_API_KEY=your-mistral-api-key-here" "$ENV_FILE" || ! grep -q "MISTRAL_API_KEY=" "$ENV_FILE"; then
        echo -e "${RED}   ⚠️  警告: MISTRAL_API_KEY 未配置或使用默认值${NC}"
        echo "   请编辑 $ENV_FILE 并设置正确的 MISTRAL_API_KEY"
    else
        echo -e "${GREEN}   ✅ MISTRAL_API_KEY 已配置${NC}"
    fi
fi

echo -e "${GREEN}✅ 环境变量检查完成${NC}"

# 5. 安装后端依赖（检查是否已安装）
echo ""
echo -e "${YELLOW}[步骤 5/6] 安装后端依赖...${NC}"
cd backend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 未找到 backend/package.json${NC}"
    exit 1
fi

# 检查 node_modules 是否存在
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    echo -e "${GREEN}   ✅ 检测到已安装的后端依赖${NC}"
    echo "   跳过安装步骤..."
    echo -e "${GREEN}✅ 后端依赖已存在${NC}"
else
    echo "   未找到依赖，开始安装..."
    echo "   📦 清理旧的依赖（如果存在）..."
    rm -rf node_modules package-lock.json 2>/dev/null || true

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
fi
cd ..

# 6. 重启服务
echo ""
echo -e "${YELLOW}[步骤 6/6] 重启服务...${NC}"

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
echo "⚠️  重要配置检查："
echo "   1. Poppler (PDF工具):"
if command -v pdftoppm &> /dev/null; then
    echo -e "      ${GREEN}✅ 已安装${NC}"
else
    echo -e "      ${RED}❌ 未安装 - 请运行: sudo yum install poppler-utils${NC}"
fi
echo "   2. Mistral API Key:"
ENV_FILE="$DEPLOY_PATH/backend/.env"
if [ -f "$ENV_FILE" ] && grep -q "MISTRAL_API_KEY=" "$ENV_FILE" && ! grep -q "MISTRAL_API_KEY=your-mistral-api-key-here" "$ENV_FILE"; then
    echo -e "      ${GREEN}✅ 已配置${NC}"
else
    echo -e "      ${RED}❌ 未配置 - 请编辑 $ENV_FILE 并设置 MISTRAL_API_KEY${NC}"
fi
echo ""
echo "🔍 查看服务状态："
echo "   pm2 list              # 查看 PM2 进程"
echo "   pm2 logs oa-backend    # 查看日志"
echo "   pm2 monit              # 监控面板"
echo ""
echo "🔧 配置 API Key："
echo "   nano $ENV_FILE        # 编辑环境变量文件"
echo "   # 设置 MISTRAL_API_KEY=your-actual-api-key"
echo ""

