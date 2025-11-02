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
        SSH_CMD="ssh -i $SSH_KEY_EXPANDED -o StrictHostKeyChecking=accept-new"
        RSYNC_SSH="ssh -i $SSH_KEY_EXPANDED -o StrictHostKeyChecking=accept-new"
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

# 使用 rsync 上传到 AWS EC2
# 注意：确保 AWS 安全组允许 SSH (端口 22) 访问
rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 4. 在服务器上安装依赖并重启
echo -e "${YELLOW}[4/5] 在服务器上安装依赖并重启服务...${NC}"

REMOTE_DEPLOY="
set -e
cd $DEPLOY_PATH

# 确保目录权限正确（AWS EC2 需要）
chmod -R 755 backend frontend 2>/dev/null || true

echo '📦 安装后端依赖...'
cd backend
npm install --production --silent

echo '🔄 重启服务...'
cd ..

# 检查 PM2 是否已安装
if command -v pm2 &> /dev/null; then
    echo '使用 PM2 重启服务...'
    pm2 restart oa-backend || pm2 start backend/server.js --name oa-backend
    pm2 save 2>/dev/null || true
else
    echo 'PM2 未安装，尝试安装 PM2...'
    # 尝试使用 sudo 安装 PM2
    if sudo npm install -g pm2 2>&1 | grep -q "pm2@"; then
        echo 'PM2 安装成功，启动服务...'
        pm2 start backend/server.js --name oa-backend || pm2 restart oa-backend
        pm2 save 2>/dev/null || true
        echo '✅ PM2 服务已启动'
    else
        echo '⚠️  PM2 安装失败，使用 npm start 启动服务...'
        cd backend
        # 停止旧进程
        pkill -f 'node.*server.js' 2>/dev/null || true
        sleep 1
        # 启动新进程
        nohup npm start > /tmp/oa-backend.log 2>&1 &
        sleep 2
        if pgrep -f 'node.*server.js' > /dev/null; then
            echo '✅ 服务已在后台启动'
            echo '   日志文件: /tmp/oa-backend.log'
            echo '   查看日志: tail -f /tmp/oa-backend.log'
        else
            echo '❌ 服务启动失败，请检查日志: /tmp/oa-backend.log'
        fi
        echo '⚠️  建议稍后手动安装 PM2: sudo npm install -g pm2'
    fi
fi

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

# 尝试健康检查
HEALTH_RESPONSE=$(curl -f -s --max-time 10 "$HEALTH_URL" 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 健康检查通过！服务运行正常${NC}"
    echo "   响应: $HEALTH_RESPONSE"
else
    echo -e "${YELLOW}⚠️  健康检查失败${NC}"
    echo "   可能原因："
    echo "     1. AWS 安全组未开放端口 $SERVER_PORT"
    echo "     2. 服务正在启动中（等待片刻后重试）"
    echo "     3. 防火墙阻止访问"
    echo ""
    echo "   请在 AWS 控制台检查安全组设置："
    echo "     - 入站规则应允许 TCP 端口 $SERVER_PORT"
    echo "     - 来源可以是: 0.0.0.0/0（公开访问）或特定 IP"
    echo ""
    echo "   服务器端检查："
    if [ -n "$SSH_KEY" ]; then
        SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
        echo "     ssh -i $SSH_KEY_EXPANDED $SERVER_USER@$SERVER_HOST 'netstat -tlnp | grep $SERVER_PORT'"
    else
        echo "     ssh $SERVER_USER@$SERVER_HOST 'netstat -tlnp | grep $SERVER_PORT'"
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

