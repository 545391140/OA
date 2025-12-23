#!/bin/bash

# 查看同步脚本实时日志
# 使用方法: ./view-sync-log.sh

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/.."
LOG_INDEX_FILE="$BACKEND_DIR/.sync-latest-log.txt"

# 检查日志索引文件是否存在
if [ ! -f "$LOG_INDEX_FILE" ]; then
    echo "❌ 错误: 未找到日志索引文件"
    echo "   请先运行同步脚本: ./run-sync-background.sh"
    exit 1
fi

# 读取日志文件路径
LOG_FILE=$(cat "$LOG_INDEX_FILE")

# 检查日志文件是否存在
if [ ! -f "$LOG_FILE" ]; then
    echo "❌ 错误: 日志文件不存在: $LOG_FILE"
    echo "   可能同步任务已完成或日志文件已被删除"
    exit 1
fi

echo "📄 查看实时日志: $LOG_FILE"
echo "   按 Ctrl+C 退出"
echo ""
echo "最近日志:"
tail -30 "$LOG_FILE"
echo ""
echo "=" | head -c 60
echo ""
echo "实时日志输出 (按 Ctrl+C 退出):"
echo ""

# 实时查看日志
tail -f "$LOG_FILE"














