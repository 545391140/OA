#!/bin/bash

# ==========================================
# AWS 服务器一键部署脚本 (GitHub 方式)
# ==========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 加载配置
if [ -f "deploy.config" ]; then
    source deploy.config
else
    # 如果在服务器上运行（检测是否已经 SSH 到服务器），使用默认配置
    if [ -n "$SSH_CLIENT" ] || [ -n "$SSH_CONNECTION" ] || [ "$(hostname)" != "$(hostname -f)" ]; then
        echo -e "${YELLOW}⚠️  未找到 deploy.config，使用服务器默认配置...${NC}"
        # 服务器端默认配置
        GITHUB_REPO="https://github.com/545391140/OA.git"
        GITHUB_BRANCH="main"
        SERVER_HOST="52.35.195.251"
        SERVER_USER="ec2-user"
        SERVER_PORT="3000"
        DEPLOY_PATH="/home/ec2-user/oa"
        RESTART_COMMAND="pm2 restart oa-backend || pm2 start backend/server.js --name oa-backend"
        echo -e "${GREEN}✅ 使用默认配置${NC}"
    else
        echo -e "${RED}❌ 错误: 未找到 deploy.config 配置文件${NC}"
        echo "请先创建 deploy.config 文件并配置服务器信息"
        echo ""
        echo "快速创建配置（服务器上）："
        echo "  cat > deploy.config << 'EOF'"
        echo "  GITHUB_REPO=\"https://github.com/545391140/OA.git\""
        echo "  SERVER_HOST=\"52.35.195.251\""
        echo "  SERVER_USER=\"ec2-user\""
        echo "  SERVER_PORT=\"3000\""
        echo "  DEPLOY_PATH=\"/home/ec2-user/oa\""
        echo "  RESTART_COMMAND=\"pm2 restart oa-backend || pm2 start backend/server.js --name oa-backend\""
        echo "  EOF"
        exit 1
    fi
fi

# 配置验证
if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ] || [ -z "$DEPLOY_PATH" ] || [ -z "$GITHUB_REPO" ]; then
    echo -e "${RED}❌ 错误: deploy.config 配置不完整${NC}"
    echo "请检查以下配置："
    echo "  - SERVER_HOST"
    echo "  - SERVER_USER"
    echo "  - DEPLOY_PATH"
    echo "  - GITHUB_REPO"
    exit 1
fi

# 构建 SSH 命令前缀（如果配置了密钥文件）
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    # 展开 ~ 路径
    SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
    if [ -f "$SSH_KEY_EXPANDED" ]; then
        SSH_CMD="ssh -i $SSH_KEY_EXPANDED"
        echo -e "${BLUE}使用 SSH 密钥: $SSH_KEY_EXPANDED${NC}"
    else
        echo -e "${YELLOW}⚠️  警告: SSH 密钥文件不存在: $SSH_KEY_EXPANDED${NC}"
        echo "   将使用默认 SSH 配置"
    fi
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 开始部署到 AWS 服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "📦 仓库: $GITHUB_REPO"
echo "🌿 分支: $CURRENT_BRANCH"
echo "🌐 服务器: $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH"
echo ""

# 1. 检查 Git 状态
echo -e "${YELLOW}[1/6] 检查 Git 状态...${NC}"
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
    git status --short
    read -p "是否提交并推送这些更改? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入提交信息: " COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="部署更新: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git add .
        git commit -m "$COMMIT_MSG"
    else
        echo -e "${RED}❌ 部署已取消${NC}"
        exit 1
    fi
fi

# 2. 推送到 GitHub
echo -e "${YELLOW}[2/6] 推送到 GitHub...${NC}"
echo "推送分支: $CURRENT_BRANCH -> origin/$CURRENT_BRANCH"

if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✅ 代码已推送到 GitHub${NC}"
else
    echo -e "${RED}❌ 推送到 GitHub 失败${NC}"
    exit 1
fi

# 3. 等待 GitHub 同步（可选，根据网络情况）
echo ""
echo -e "${YELLOW}等待 3 秒以确保 GitHub 同步...${NC}"
sleep 3

# 4. 在服务器上拉取最新代码
echo -e "${YELLOW}[3/6] 在服务器上拉取最新代码...${NC}"

REMOTE_DEPLOY_COMMANDS="
set -e
echo '📥 拉取最新代码...'
cd $DEPLOY_PATH

# 如果目录不存在，克隆仓库
if [ ! -d '.git' ]; then
    echo '📦 首次部署: 克隆仓库...'
    git clone $GITHUB_REPO .
else
    echo '🔄 更新代码...'
    git fetch origin
    git reset --hard origin/$CURRENT_BRANCH
    git clean -fd
fi

echo '✅ 代码更新完成'
"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" "$REMOTE_DEPLOY_COMMANDS"

echo -e "${GREEN}✅ 代码已同步到服务器${NC}"

# 5. 在服务器上构建和部署
echo -e "${YELLOW}[4/6] 在服务器上构建和部署...${NC}"

REMOTE_BUILD_COMMANDS="
set -e
cd $DEPLOY_PATH

echo '📦 安装后端依赖...'
cd backend
npm install --production --silent

echo '📦 安装前端依赖...'
cd ../frontend
npm install --silent

echo '🏗️  构建前端...'
npm run build

echo '🔄 重启服务...'
cd ..
$RESTART_COMMAND

echo '✅ 部署完成！'
"

$SSH_CMD "$SERVER_USER@$SERVER_HOST" "$REMOTE_BUILD_COMMANDS"

echo -e "${GREEN}✅ 服务器部署完成${NC}"

# 6. 健康检查
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 执行健康检查...${NC}"
echo -e "${BLUE}========================================${NC}"

HEALTH_URL="http://$SERVER_HOST:$SERVER_PORT/health"
echo "检查: $HEALTH_URL"

# 等待几秒让服务启动
sleep 3

if curl -f -s --max-time 10 "$HEALTH_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查通过！服务运行正常${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查失败，请检查服务器日志${NC}"
    echo "   可以通过以下命令查看日志："
    if [ -n "$SSH_KEY" ]; then
        SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
        echo "   ssh -i $SSH_KEY_EXPANDED $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH/backend && tail -f server.log'"
    else
        echo "   ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH/backend && tail -f server.log'"
    fi
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
