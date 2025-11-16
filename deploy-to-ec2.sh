#!/bin/bash

# ==========================================
# 部署脚本 - 部署到 AWS EC2 服务器
# 服务器信息:
#   IP: 54.238.122.205
#   路径: /home/ec2-user/travel
#   用户: ec2-user
#   密钥: /Users/liuzhijian/Downloads/5453.pem
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
echo -e "${BLUE}🚀 开始部署到 AWS EC2${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "🌐 服务器: $SERVER_USER@$SERVER_HOST"
echo "📁 部署路径: $DEPLOY_PATH"
echo "🔑 密钥文件: $SSH_KEY"
echo ""

# 1. 测试服务器连接
echo -e "${YELLOW}[步骤 1/5] 测试服务器连接...${NC}"
if $SSH_CMD "$SERVER_USER@$SERVER_HOST" "echo '连接成功'" 2>/dev/null; then
    echo -e "${GREEN}✅ 服务器连接成功${NC}"
else
    echo -e "${RED}❌ 服务器连接失败，请检查：${NC}"
    echo "   - 服务器IP是否正确: $SERVER_HOST"
    echo "   - 密钥文件是否存在: $SSH_KEY"
    echo "   - 服务器安全组是否允许SSH连接"
    exit 1
fi

# 2. 创建部署目录
echo ""
echo -e "${YELLOW}[步骤 2/5] 准备服务器目录...${NC}"
$SSH_CMD "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH && chmod 755 $DEPLOY_PATH" 2>/dev/null
echo -e "${GREEN}✅ 服务器目录准备完成${NC}"

# 3. 准备本地文件
echo ""
echo -e "${YELLOW}[步骤 3/5] 准备本地文件...${NC}"
DEPLOY_DIR="deploy_temp_$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# 复制后端文件
echo "   复制后端文件..."
mkdir -p "$DEPLOY_DIR/backend"
rsync -av --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='.env*' \
          --exclude='uploads/*' \
          --exclude='.git' \
          --exclude='build' \
          backend/ "$DEPLOY_DIR/backend/"

# 复制前端文件（包含build目录如果存在）
echo "   复制前端文件..."
mkdir -p "$DEPLOY_DIR/frontend"
if [ -d "frontend/build" ]; then
    echo "   ✅ 包含本地构建的build目录"
    rsync -av --exclude='node_modules' \
              --exclude='.git' \
              --exclude='*.log' \
              --exclude='.DS_Store' \
              --exclude='.env*' \
              frontend/ "$DEPLOY_DIR/frontend/"
else
    echo "   ⚠️  本地没有build目录，将在服务器上构建"
    rsync -av --exclude='node_modules' \
              --exclude='build' \
              --exclude='.git' \
              --exclude='*.log' \
              --exclude='.DS_Store' \
              --exclude='.env*' \
              frontend/ "$DEPLOY_DIR/frontend/"
fi

# 复制根目录文件
if [ -f "package.json" ]; then
    cp package.json "$DEPLOY_DIR/"
fi

# 复制部署脚本
if [ -f "deploy-on-server.sh" ]; then
    cp deploy-on-server.sh "$DEPLOY_DIR/"
    chmod +x "$DEPLOY_DIR/deploy-on-server.sh"
fi

echo -e "${GREEN}✅ 本地文件准备完成${NC}"

# 4. 上传文件到服务器
echo ""
echo -e "${YELLOW}[步骤 4/5] 上传文件到服务器...${NC}"
echo "   这可能需要几分钟，请耐心等待..."

rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 5. 在服务器上执行部署
echo ""
echo -e "${YELLOW}[步骤 5/5] 在服务器上执行部署...${NC}"
echo "   这可能需要较长时间，请耐心等待..."

# 远程执行部署脚本
$SSH_CMD "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 确保部署脚本有执行权限
chmod +x deploy-on-server.sh 2>/dev/null || true

# 执行部署
if [ -f "deploy-on-server.sh" ]; then
    bash deploy-on-server.sh
else
    echo "⚠️  警告: deploy-on-server.sh 未找到，手动执行部署步骤..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "安装 Node.js..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 18 && nvm use 18
    fi
    
    # 安装前端依赖并构建
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        npm run build
        cd ..
    fi
    
    # 安装后端依赖
    if [ -d "backend" ]; then
        cd backend
        npm install --production
        cd ..
    fi
    
    # 启动服务（使用PM2）
    if command -v pm2 &> /dev/null; then
        pm2 restart oa-backend 2>/dev/null || pm2 start backend/server.js --name oa-backend
        pm2 save
    else
        npm install -g pm2
        pm2 start backend/server.js --name oa-backend
        pm2 save
    fi
fi
ENDSSH

# 清理临时文件
echo ""
echo -e "${YELLOW}清理临时文件...${NC}"
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✅ 清理完成${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 部署信息："
echo "   - 服务器: $SERVER_USER@$SERVER_HOST"
echo "   - 路径: $DEPLOY_PATH"
echo "   - 访问地址: http://$SERVER_HOST:3000"
echo ""
echo "🔍 查看服务状态："
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 list'"
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 logs oa-backend'"
echo ""
echo "🔧 手动连接服务器："
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
echo "   cd $DEPLOY_PATH"
echo ""

