#!/bin/bash

# ==========================================
# AWS 服务器一键部署脚本
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
    echo -e "${RED}❌ 错误: 未找到 deploy.config 配置文件${NC}"
    echo "请先创建 deploy.config 文件并配置服务器信息"
    exit 1
fi

# 配置验证
if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ] || [ -z "$DEPLOY_PATH" ]; then
    echo -e "${RED}❌ 错误: deploy.config 配置不完整${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 开始部署到 AWS 服务器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查 Git 状态
echo -e "${YELLOW}[1/7] 检查 Git 状态...${NC}"
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
    read -p "是否继续部署? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. 安装依赖
echo -e "${YELLOW}[2/7] 安装依赖...${NC}"
echo "安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install --production
else
    npm install --production --silent
fi
cd ..

echo "安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    npm install --silent
fi
cd ..

# 3. 构建前端
echo -e "${YELLOW}[3/7] 构建前端...${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 4. 创建部署包
echo -e "${YELLOW}[4/7] 创建部署包...${NC}"
DEPLOY_DIR="deploy_temp_$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# 复制后端文件
echo "复制后端文件..."
mkdir -p "$DEPLOY_DIR/backend"
rsync -av --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='.env*' \
          --exclude='uploads/*' \
          backend/ "$DEPLOY_DIR/backend/"

# 复制前端构建文件
echo "复制前端构建文件..."
mkdir -p "$DEPLOY_DIR/frontend"
cp -r frontend/build/* "$DEPLOY_DIR/frontend/"

# 复制必要的配置文件
if [ -f "package.json" ]; then
    cp package.json "$DEPLOY_DIR/"
fi

echo -e "${GREEN}✅ 部署包创建完成${NC}"

# 5. 上传到服务器
echo -e "${YELLOW}[5/7] 上传文件到服务器...${NC}"
echo "服务器: $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH"

# 使用 rsync 上传（更快且支持断点续传）
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${GREEN}✅ 文件上传完成${NC}"

# 6. 在服务器上执行部署
echo -e "${YELLOW}[6/7] 在服务器上执行部署...${NC}"

# 构建远程命令
REMOTE_COMMANDS="
cd $DEPLOY_PATH && \
echo '📦 安装后端依赖...' && \
cd backend && \
npm install --production && \
echo '🔄 重启服务...' && \
$RESTART_COMMAND && \
echo '✅ 部署完成！'
"

# 执行远程命令
ssh "$SERVER_USER@$SERVER_HOST" "$REMOTE_COMMANDS"

echo -e "${GREEN}✅ 服务器部署完成${NC}"

# 7. 清理临时文件
echo -e "${YELLOW}[7/7] 清理临时文件...${NC}"
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✅ 清理完成${NC}"

# 8. 健康检查
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 执行健康检查...${NC}"
echo -e "${BLUE}========================================${NC}"

HEALTH_URL="http://$SERVER_HOST:$SERVER_PORT/health"
echo "检查: $HEALTH_URL"

if curl -f -s "$HEALTH_URL" > /dev/null; then
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

