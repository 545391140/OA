#!/bin/bash

# ==========================================
# 完整部署脚本 - 确保所有文件完整上传并部署
# ==========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置
SERVER_HOST="54.238.122.205"
SERVER_USER="ec2-user"
DEPLOY_PATH="/home/ec2-user/travel"
SSH_KEY="/Users/liuzhijian/Downloads/5453.pem"

# 验证密钥文件
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ 错误: SSH 密钥文件不存在: $SSH_KEY${NC}"
    exit 1
fi

# 设置密钥权限
chmod 400 "$SSH_KEY" 2>/dev/null || true

# SSH 命令
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null"
RSYNC_SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 完整部署到 AWS EC2${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "🌐 服务器: $SERVER_USER@$SERVER_HOST"
echo "📁 部署路径: $DEPLOY_PATH"
echo ""

# 1. 测试服务器连接
echo -e "${YELLOW}[步骤 1/6] 测试服务器连接...${NC}"
if $SSH_CMD "$SERVER_USER@$SERVER_HOST" "echo '连接成功'" 2>/dev/null; then
    echo -e "${GREEN}✅ 服务器连接成功${NC}"
else
    echo -e "${RED}❌ 服务器连接失败${NC}"
    exit 1
fi

# 2. 停止服务器上的旧服务
echo ""
echo -e "${YELLOW}[步骤 2/6] 停止旧服务...${NC}"
$SSH_CMD "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel
pkill -f 'node.*server.js' 2>/dev/null || true
sleep 2
echo "旧服务已停止"
ENDSSH
echo -e "${GREEN}✅ 旧服务已停止${NC}"

# 3. 准备本地文件（强制重新构建最新版本）
echo ""
echo -e "${YELLOW}[步骤 3/6] 构建本地最新版本...${NC}"
cd /Users/liuzhijian/Documents/Code/OA

# 强制重新构建前端（确保使用最新代码）
echo "   正在构建前端最新版本..."
cd frontend
npm run build
cd ..
if [ -d "frontend/build" ] && [ -f "frontend/build/index.html" ]; then
    echo -e "${GREEN}✅ 前端构建完成${NC}"
else
    echo -e "${RED}❌ 前端构建失败${NC}"
    exit 1
fi

# 4. 使用rsync增量同步文件到服务器（只上传修改的文件）
echo ""
echo -e "${YELLOW}[步骤 4/6] 增量上传修改的文件到服务器...${NC}"
echo "   只会上传已修改的文件，这通常很快..."
echo -e "${BLUE}   ⚠️  保护服务器上传文件：uploads/ 不会被覆盖${NC}"
echo -e "${BLUE}   ✅ 配置文件会同步更新：.env*, config.js${NC}"

# 创建服务器目录（不删除现有文件）
$SSH_CMD "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH/backend $DEPLOY_PATH/frontend"

# 上传后端文件（只同步修改的文件，保护上传文件目录）
echo "   同步后端文件（增量，包含配置文件）..."
rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='uploads/' \
    --exclude='uploads/**' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    backend/ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/backend/"

# 上传前端文件（只同步修改的文件，包含build目录和配置文件）
echo "   同步前端文件（增量，包含配置文件）..."
rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='src' \
    --include='build/**' \
    --include='public/**' \
    --include='package.json' \
    --include='package-lock.json' \
    frontend/ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/frontend/"

# 上传根目录文件（只同步修改的文件）
echo "   同步配置文件（增量）..."
if [ -f "package.json" ]; then
    rsync -avz --update -e "$RSYNC_SSH" package.json "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
fi


echo -e "${GREEN}✅ 增量文件同步完成${NC}"

# 5. 在服务器上安装依赖和部署（仅在需要时）
echo ""
echo -e "${YELLOW}[步骤 5/6] 检查并安装依赖（仅在需要时）...${NC}"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 加载 Node.js 环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 确保使用 Node.js 20.16.0
nvm use 20.16.0 2>/dev/null || (nvm install 20.16.0 && nvm use 20.16.0)

# 检查前端依赖（仅在 package.json 更新时安装）
cd frontend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] || [ "package-lock.json" -nt "node_modules/.package-lock.json" ]; then
    echo "检测到前端依赖变化，安装依赖..."
    npm install --production 2>&1 | tail -20
else
    echo "✅ 前端依赖无需更新"
fi

# 如果build目录存在，移动构建文件到正确位置（仅在build目录更新时）
if [ -d "build" ]; then
    # 检查是否需要更新构建文件
    NEED_UPDATE=false
    if [ ! -f "index.html" ] || [ "build/index.html" -nt "index.html" ]; then
        NEED_UPDATE=true
    fi
    
    if [ "$NEED_UPDATE" = true ]; then
        echo "更新构建文件..."
        [ -f "index.html" ] && [ ! -f "index.html.bak" ] && mv index.html index.html.bak 2>/dev/null || true
        [ -d "static" ] && [ ! -d "static.bak" ] && mv static static.bak 2>/dev/null || true
        cp -r build/* . 2>/dev/null || true
        
        if [ -f "index.html" ] && [ -d "static" ]; then
            echo "✅ 构建文件已更新"
        else
            echo "⚠️  警告: 构建文件可能不完整"
        fi
    else
        echo "✅ 构建文件无需更新"
    fi
fi
cd ..

# 检查后端依赖（仅在 package.json 更新时安装）
cd backend
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] || [ "package-lock.json" -nt "node_modules/.package-lock.json" ]; then
    echo "检测到后端依赖变化，安装依赖..."
    npm install --production 2>&1 | tail -20
else
    echo "✅ 后端依赖无需更新"
fi
cd ..

echo "✅ 依赖检查完成"
ENDSSH

echo -e "${GREEN}✅ 依赖检查完成${NC}"

# 6. 启动服务
echo ""
echo -e "${YELLOW}[步骤 6/6] 启动服务...${NC}"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 加载 Node.js 环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 确保旧进程已停止
pkill -f 'node.*server.js' 2>/dev/null || true
sleep 2

# 启动服务
cd backend
nohup npm start > /tmp/oa-backend.log 2>&1 &
sleep 5

# 检查服务是否启动
if pgrep -f 'node.*server.js' > /dev/null; then
    echo "✅ 服务已启动"
    ps aux | grep 'node.*server.js' | grep -v grep | head -1
else
    echo "❌ 服务启动失败，查看日志:"
    tail -30 /tmp/oa-backend.log
    exit 1
fi
ENDSSH

echo -e "${GREEN}✅ 服务已启动${NC}"

# 7. 验证部署
echo ""
echo -e "${YELLOW}验证部署...${NC}"
sleep 3

# 检查健康检查
HEALTH=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'curl -s http://localhost:3001/health 2>&1' || echo "failed")
if echo "$HEALTH" | grep -q "status"; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查异常: $HEALTH${NC}"
fi

# 检查进程
PROCESS=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'ps aux | grep "node.*server.js" | grep -v grep | wc -l' || echo "0")
if [ "$PROCESS" -gt "0" ]; then
    echo -e "${GREEN}✅ 服务进程运行中${NC}"
else
    echo -e "${RED}❌ 服务进程未运行${NC}"
fi

# 检查文件完整性
echo ""
echo -e "${YELLOW}检查文件完整性...${NC}"
FILES_CHECK=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel
echo "检查关键文件:"
[ -f "backend/server.js" ] && echo "✅ backend/server.js" || echo "❌ backend/server.js"
[ -f "frontend/index.html" ] && echo "✅ frontend/index.html" || echo "❌ frontend/index.html"
[ -d "frontend/static" ] && echo "✅ frontend/static" || echo "❌ frontend/static"
[ -d "backend/node_modules" ] && echo "✅ backend/node_modules" || echo "❌ backend/node_modules"
ENDSSH
)
echo "$FILES_CHECK"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 增量部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 部署信息："
echo "   - 服务器: $SERVER_USER@$SERVER_HOST"
echo "   - 路径: $DEPLOY_PATH"
echo "   - 部署模式: 增量同步（只上传修改的文件）"
echo "   - 访问地址: http://$SERVER_HOST:3001"
echo "   - 健康检查: http://$SERVER_HOST:3001/health"
echo ""
echo "💡 提示："
echo "   - 此脚本使用增量同步，只会上传已修改的文件"
echo "   - 依赖安装仅在 package.json 更新时执行"
echo "   - 构建文件仅在 build 目录更新时复制"
echo "   - ✅ 配置文件会同步更新（如果本地有修改）："
echo "     • backend/.env* (环境变量)"
echo "     • backend/config.js (服务器配置)"
echo "   - 🔒 服务器上传文件受保护，不会被覆盖："
echo "     • backend/uploads/ (用户上传的文件)"
echo ""
echo "🔍 查看服务状态："
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'ps aux | grep node'"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'tail -f /tmp/oa-backend.log'"
echo ""




