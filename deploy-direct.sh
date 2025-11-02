#!/bin/bash

# ==========================================
# 直接上传部署脚本
# 将代码直接上传到服务器，不通过 GitHub
# ==========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 加载配置
if [ -f "deploy.config" ]; then
    source deploy.config
else
    echo -e "${RED}❌ 错误: 未找到 deploy.config 配置文件${NC}"
    exit 1
fi

# 构建 SSH 命令前缀
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
    if [ -f "$SSH_KEY_EXPANDED" ]; then
        SSH_CMD="ssh -i $SSH_KEY_EXPANDED"
        RSYNC_SSH="ssh -i $SSH_KEY_EXPANDED"
    else
        echo -e "${YELLOW}⚠️  警告: SSH 密钥文件不存在，使用默认 SSH 配置${NC}"
        RSYNC_SSH="ssh"
    fi
else
    RSYNC_SSH="ssh"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 直接上传部署到服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "🌐 服务器: $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH"
echo ""

# 1. 构建前端
echo -e "${YELLOW}[1/5] 构建前端...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "构建前端..."
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}❌ 构建失败：未找到 build 目录${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 前端构建完成${NC}"
cd ..

# 2. 创建临时部署目录
echo -e "${YELLOW}[2/5] 准备部署文件...${NC}"
DEPLOY_DIR="deploy_temp_$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# 复制后端文件
echo "复制后端文件..."
mkdir -p "$DEPLOY_DIR/backend"
rsync -av --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='.env*' \
          --exclude='uploads/*' \
          --exclude='.git' \
          backend/ "$DEPLOY_DIR/backend/"

# 复制前端构建文件
echo "复制前端构建文件..."
mkdir -p "$DEPLOY_DIR/frontend"
cp -r frontend/build/* "$DEPLOY_DIR/frontend/"

# 复制必要的配置文件
if [ -f "package.json" ]; then
    cp package.json "$DEPLOY_DIR/"
fi

echo -e "${GREEN}✅ 部署文件准备完成${NC}"

# 3. 上传到服务器
echo -e "${YELLOW}[3/5] 上传文件到服务器...${NC}"

# 使用 rsync 上传
rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 4. 在服务器上安装依赖并重启
echo -e "${YELLOW}[4/5] 在服务器上安装依赖并重启服务...${NC}"

REMOTE_DEPLOY="
set -e
cd $DEPLOY_PATH

echo '📦 安装后端依赖...'
cd backend
npm install --production --silent

echo '🔄 重启服务...'
cd ..
$RESTART_COMMAND

echo '✅ 部署完成！'
"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" "$REMOTE_DEPLOY"

echo -e "${GREEN}✅ 服务器部署完成${NC}"

# 5. 清理临时文件
echo -e "${YELLOW}[5/5] 清理临时文件...${NC}"
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✅ 清理完成${NC}"

# 6. 健康检查
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 执行健康检查...${NC}"
echo -e "${BLUE}========================================${NC}"

HEALTH_URL="http://$SERVER_HOST:$SERVER_PORT/health"
echo "检查: $HEALTH_URL"

sleep 3

if curl -f -s --max-time 10 "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查通过！服务运行正常${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查失败，请检查服务器日志${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://$SERVER_HOST:$SERVER_PORT"
echo "   后端: http://$SERVER_HOST:$SERVER_PORT/api"
echo "   健康检查: http://$SERVER_HOST:$SERVER_PORT/health"
echo ""
echo "📝 查看日志:"
if [ -n "$SSH_KEY" ]; then
    SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
    echo "   ssh -i $SSH_KEY_EXPANDED $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH/backend && tail -f server.log'"
else
    echo "   ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH/backend && tail -f server.log'"
fi
echo ""

