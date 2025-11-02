#!/bin/bash

# ==========================================
# 服务器启动脚本
# 用于启动后端服务
# ==========================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取脚本所在目录（部署路径）
DEPLOY_PATH=$(cd "$(dirname "$0")" && pwd)
BACKEND_PATH="$DEPLOY_PATH/backend"

echo -e "${YELLOW}=== 启动服务 ===${NC}"
echo "部署路径: $DEPLOY_PATH"
echo "后端路径: $BACKEND_PATH"
echo ""

# 进入后端目录
cd "$BACKEND_PATH"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 错误: .env 文件不存在${NC}"
    exit 1
fi

echo "✅ 找到 .env 文件"
echo ""

# 停止旧进程
echo "停止旧服务..."
pkill -f 'node.*server.js' 2>/dev/null || true
pkill -f 'npm start' 2>/dev/null || true
sleep 2

# 加载环境变量并启动服务
echo "加载环境变量并启动服务..."
source <(cat .env | grep -v '^#' | sed 's/^/export /')

# 启动服务
echo "正在启动服务..."
nohup node server.js > /tmp/oa-backend.log 2>&1 &

# 等待服务启动
sleep 5

# 检查服务是否运行
if ps aux | grep -E 'node.*server\.js' | grep -v grep > /dev/null; then
    echo -e "${GREEN}✅ 服务已启动${NC}"
    echo ""
    echo "进程信息:"
    ps aux | grep 'node.*server.js' | grep -v grep | head -1
    echo ""
    echo "日志文件: /tmp/oa-backend.log"
    echo "查看日志: tail -f /tmp/oa-backend.log"
    echo ""
    echo "最近日志:"
    tail -10 /tmp/oa-backend.log
else
    echo -e "${RED}❌ 服务启动失败${NC}"
    echo "查看日志: tail -20 /tmp/oa-backend.log"
    tail -20 /tmp/oa-backend.log
    exit 1
fi


