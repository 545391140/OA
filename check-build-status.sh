#!/bin/bash

# 检查构建状态脚本
# 在服务器上运行此脚本来检查构建进程状态

echo "🔍 检查构建进程状态..."
echo ""

# 检查是否有 npm/node 进程在运行
echo "📊 运行中的 Node.js 进程:"
ps aux | grep -E "node|npm" | grep -v grep || echo "  无"

echo ""
echo "💾 内存使用情况:"
free -h

echo ""
echo "💿 磁盘空间:"
df -h | head -2

echo ""
echo "📝 最近的构建日志（如果有）:"
if [ -f "frontend/build.log" ]; then
    tail -20 frontend/build.log
elif [ -f "npm-debug.log" ]; then
    tail -20 npm-debug.log
else
    echo "  未找到日志文件"
fi

echo ""
echo "💡 如果构建卡住，可以："
echo "  1. 按 Ctrl+C 中断当前构建"
echo "  2. 检查错误日志"
echo "  3. 尝试手动构建: cd frontend && npm run build"
echo "  4. 或者增加服务器内存/资源"

