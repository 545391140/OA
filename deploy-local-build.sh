#!/bin/bash

# ==========================================
# 本地构建并部署脚本
# 在本地构建前端，然后部署到服务器
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 本地构建并部署到服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 在本地构建前端
echo -e "${YELLOW}[1/4] 在本地构建前端...${NC}"
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

# 2. 提交并推送到 GitHub
echo -e "${YELLOW}[2/4] 提交并推送到 GitHub...${NC}"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

if ! git diff-index --quiet HEAD --; then
    git add frontend/build
    git commit -m "build: 更新前端构建文件" || echo "无新更改"
fi

git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}✅ 代码已推送到 GitHub${NC}"

# 3. 在服务器上拉取代码
echo -e "${YELLOW}[3/4] 在服务器上拉取代码...${NC}"

SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
    if [ -f "$SSH_KEY_EXPANDED" ]; then
        SSH_CMD="ssh -i $SSH_KEY_EXPANDED"
    fi
fi

REMOTE_COMMANDS="
cd $DEPLOY_PATH
git pull origin $CURRENT_BRANCH
echo '✅ 代码已更新'
"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" "$REMOTE_COMMANDS"
echo -e "${GREEN}✅ 服务器代码已更新${NC}"

# 4. 在服务器上部署后端并重启
echo -e "${YELLOW}[4/4] 在服务器上部署后端...${NC}"

REMOTE_DEPLOY="
cd $DEPLOY_PATH/backend
npm install --production --silent
cd ..
$RESTART_COMMAND
echo '✅ 部署完成'
"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" "$REMOTE_DEPLOY"
echo -e "${GREEN}✅ 部署完成！${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://$SERVER_HOST:$SERVER_PORT"
echo "   后端: http://$SERVER_HOST:$SERVER_PORT/api"
echo ""

