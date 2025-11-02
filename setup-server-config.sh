#!/bin/bash

# ==========================================
# 服务器配置设置脚本
# 在服务器上运行此脚本来创建 deploy.config
# ==========================================

echo "🔧 设置服务器部署配置..."

cat > deploy.config << 'EOF'
# ==========================================
# AWS 服务器部署配置文件 (GitHub 方式)
# ==========================================

# GitHub 仓库信息
GITHUB_REPO="https://github.com/545391140/OA.git"
GITHUB_BRANCH="main"

# 服务器信息
SERVER_HOST="52.35.195.251"
SERVER_USER="ec2-user"
SERVER_PORT="3000"
DEPLOY_PATH="/home/ec2-user/oa"

# SSH 配置（服务器上不需要 SSH_KEY）
# SSH_KEY=""

# 服务重启命令
RESTART_COMMAND="pm2 restart oa-backend || pm2 start backend/server.js --name oa-backend"
EOF

echo "✅ deploy.config 文件已创建"
echo ""
echo "📝 请检查配置是否正确，然后可以运行: ./deploy.sh"

