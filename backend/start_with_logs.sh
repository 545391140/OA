#!/bin/bash

# 启动后端服务器并显示日志
cd "$(dirname "$0")"

echo "🚀 启动后端服务器（带日志输出）..."
echo "📝 日志将显示在控制台"
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动服务器
node server.js

