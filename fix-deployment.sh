#!/bin/bash

# ==========================================
# 修复部署脚本 - 确保所有功能都正确部署
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 修复服务器部署${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 重新构建前端（确保使用最新代码）
echo -e "${YELLOW}[步骤 1/4] 在服务器上重新构建前端...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 加载 Node.js 环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 进入前端目录
cd frontend

# 确保依赖已安装
echo "检查并安装前端依赖..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
    echo "安装前端依赖..."
    npm install
else
    echo "前端依赖已是最新"
fi

# 重新构建前端
echo "重新构建前端..."
npm run build

# 确保构建文件移动到正确位置
if [ -d "build" ]; then
    echo "移动构建文件到正确位置..."
    # 备份旧文件
    [ -f "index.html" ] && [ ! -f "index.html.bak" ] && mv index.html index.html.bak
    [ -d "static" ] && [ ! -d "static.bak" ] && mv static static.bak
    
    # 复制新文件
    cp -r build/* .
    
    # 验证
    if [ -f "index.html" ] && [ -d "static" ]; then
        echo "✅ 前端构建文件已更新"
    else
        echo "❌ 前端构建文件更新失败"
        exit 1
    fi
fi

cd ..
ENDSSH

echo -e "${GREEN}✅ 前端重新构建完成${NC}"

# 2. 检查后端依赖
echo ""
echo -e "${YELLOW}[步骤 2/4] 检查后端依赖...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 加载 Node.js 环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd backend

# 检查依赖
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
    echo "安装后端依赖..."
    npm install --production
else
    echo "后端依赖已是最新"
fi

cd ..
ENDSSH

echo -e "${GREEN}✅ 后端依赖检查完成${NC}"

# 3. 重启服务
echo ""
echo -e "${YELLOW}[步骤 3/4] 重启服务...${NC}"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/ec2-user/travel

# 停止旧服务
echo "停止旧服务..."
pkill -f 'node.*server.js' 2>/dev/null || true
sleep 2

# 启动新服务
echo "启动新服务..."
cd backend
nohup npm start > /tmp/oa-backend.log 2>&1 &
sleep 3

# 检查服务是否启动
if pgrep -f 'node.*server.js' > /dev/null; then
    echo "✅ 服务已启动"
else
    echo "❌ 服务启动失败，查看日志:"
    tail -20 /tmp/oa-backend.log
    exit 1
fi
ENDSSH

echo -e "${GREEN}✅ 服务已重启${NC}"

# 4. 验证部署
echo ""
echo -e "${YELLOW}[步骤 4/4] 验证部署...${NC}"
sleep 2

# 检查健康检查端点
HEALTH_CHECK=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'curl -s http://localhost:3000/health 2>&1' || echo "failed")
if echo "$HEALTH_CHECK" | grep -q "status"; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
    echo "   响应: $HEALTH_CHECK"
else
    echo -e "${RED}❌ 健康检查失败${NC}"
    echo "   响应: $HEALTH_CHECK"
fi

# 检查静态文件
STATIC_JS=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/static/js/main.69e1602a.js 2>&1' || echo "000")
if [ "$STATIC_JS" = "200" ]; then
    echo -e "${GREEN}✅ 静态JS文件可访问${NC}"
else
    echo -e "${YELLOW}⚠️  静态JS文件访问异常 (HTTP $STATIC_JS)${NC}"
fi

STATIC_CSS=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/static/css/main.43d31c07.css 2>&1' || echo "000")
if [ "$STATIC_CSS" = "200" ]; then
    echo -e "${GREEN}✅ 静态CSS文件可访问${NC}"
else
    echo -e "${YELLOW}⚠️  静态CSS文件访问异常 (HTTP $STATIC_CSS)${NC}"
fi

# 检查进程
PROCESS=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" 'ps aux | grep "node.*server.js" | grep -v grep | wc -l' || echo "0")
if [ "$PROCESS" -gt "0" ]; then
    echo -e "${GREEN}✅ 服务进程正在运行${NC}"
else
    echo -e "${RED}❌ 服务进程未运行${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署修复完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 访问信息："
echo "   - 应用地址: http://$SERVER_HOST:3000"
echo "   - 健康检查: http://$SERVER_HOST:3000/health"
echo ""
echo "🔍 查看日志："
echo "   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'tail -f /tmp/oa-backend.log'"
echo ""

