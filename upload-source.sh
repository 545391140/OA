#!/bin/bash

# ==========================================
# 源代码上传脚本
# 仅上传源代码到服务器，不进行构建和部署
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
echo -e "${BLUE}📤 上传源代码到服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "🌐 服务器: $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH"
echo "📦 上传方式: 仅上传源代码，不构建"
echo ""

# 1. 创建临时部署目录
echo -e "${YELLOW}[1/3] 准备源代码文件...${NC}"
DEPLOY_DIR="deploy_temp_$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# 复制后端源代码
echo "复制后端源代码..."
mkdir -p "$DEPLOY_DIR/backend"
rsync -av --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='.env*' \
          --exclude='uploads/*' \
          --exclude='.git' \
          --exclude='build' \
          backend/ "$DEPLOY_DIR/backend/"

# 复制前端源代码和构建文件
echo "复制前端源代码..."
mkdir -p "$DEPLOY_DIR/frontend"

# 如果本地有build目录，包含它（这样就不需要在服务器上构建）
if [ -d "frontend/build" ]; then
    echo "   包含本地构建的build目录..."
    rsync -av --exclude='node_modules' \
              --exclude='.git' \
              --exclude='*.log' \
              --exclude='.DS_Store' \
              --exclude='.env*' \
              frontend/ "$DEPLOY_DIR/frontend/"
else
    echo "   本地没有build目录，将包含源代码..."
    rsync -av --exclude='node_modules' \
              --exclude='build' \
              --exclude='.git' \
              --exclude='*.log' \
              --exclude='.DS_Store' \
              --exclude='.env*' \
              frontend/ "$DEPLOY_DIR/frontend/"
fi

# 复制必要的配置文件
if [ -f "package.json" ]; then
    cp package.json "$DEPLOY_DIR/"
fi

# 复制服务器端部署脚本
if [ -f "deploy-on-server.sh" ]; then
    cp deploy-on-server.sh "$DEPLOY_DIR/"
    echo -e "${GREEN}✅ 部署脚本 deploy-on-server.sh 已包含${NC}"
else
    echo -e "${YELLOW}⚠️  警告: 未找到 deploy-on-server.sh，将不会上传部署脚本${NC}"
fi

echo -e "${GREEN}✅ 源代码准备完成${NC}"

# 2. 上传到服务器
echo -e "${YELLOW}[2/3] 上传源代码到服务器...${NC}"

# 使用 rsync 上传到 AWS EC2
rsync -avz --progress \
    -e "$RSYNC_SSH" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ 源代码上传完成${NC}"

# 验证部署脚本是否已上传
echo -e "${YELLOW}   验证上传文件...${NC}"
if [ -f "deploy-on-server.sh" ]; then
    $SSH_CMD "$SERVER_USER@$SERVER_HOST" "test -f $DEPLOY_PATH/deploy-on-server.sh && echo '✅ deploy-on-server.sh 已上传到服务器' || echo '❌ deploy-on-server.sh 未找到'" 2>/dev/null || echo "   无法验证（SSH连接失败）"
fi

# 3. 清理临时文件
echo -e "${YELLOW}[3/3] 清理临时文件...${NC}"
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✅ 清理完成${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 代码上传完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 下一步操作："
if [ -f "deploy-on-server.sh" ]; then
    echo -e "${GREEN}✅ 部署脚本已上传，可以在服务器上执行部署${NC}"
    echo ""
    echo "   方式 1: SSH 到服务器手动执行"
    if [ -n "$SSH_KEY" ]; then
        SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
        echo "      ssh -i $SSH_KEY_EXPANDED $SERVER_USER@$SERVER_HOST"
    else
        echo "      ssh $SERVER_USER@$SERVER_HOST"
    fi
    echo "      cd $DEPLOY_PATH"
    echo "      chmod +x deploy-on-server.sh"
    echo "      bash deploy-on-server.sh"
    echo ""
    echo "   方式 2: 远程执行部署脚本"
    if [ -n "$SSH_KEY" ]; then
        SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
        echo "      ssh -i $SSH_KEY_EXPANDED $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && chmod +x deploy-on-server.sh && bash deploy-on-server.sh'"
    else
        echo "      ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && chmod +x deploy-on-server.sh && bash deploy-on-server.sh'"
    fi
else
    echo -e "${YELLOW}⚠️  注意: deploy-on-server.sh 未上传，请手动上传后再执行部署${NC}"
fi
echo ""

