#!/bin/bash

# ==========================================
# 在AWS服务器上执行后台同步脚本
# 使用方法: 
#   1. 上传此脚本到服务器
#   2. SSH连接到服务器
#   3. 执行: ./run-sync-on-server.sh [选项]
# ==========================================

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/.."

# 日志文件路径
LOG_DIR="$BACKEND_DIR/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/sync-${TIMESTAMP}.log"
PID_FILE="$BACKEND_DIR/.sync.pid"
LOG_INDEX_FILE="$BACKEND_DIR/.sync-latest-log.txt"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查是否已有同步进程在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  警告: 同步脚本已在运行 (PID: $OLD_PID)"
        echo "   如需强制停止，请执行: kill $OLD_PID && rm $PID_FILE"
        echo "   查看日志: tail -f $LOG_FILE"
        exit 1
    else
        # PID文件存在但进程不存在，清理PID文件
        rm -f "$PID_FILE"
    fi
fi

# 进入后端目录
cd "$BACKEND_DIR"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    exit 1
fi

# 构建命令
SYNC_SCRIPT="$SCRIPT_DIR/syncGlobalLocations.js"
ARGS="$@"

# 启动后台进程
echo "🚀 启动后台同步任务..."
echo "   日志文件: $LOG_FILE"
echo "   命令: node $SYNC_SCRIPT $ARGS"

# 使用nohup在后台执行，并将输出重定向到日志文件
nohup node "$SYNC_SCRIPT" $ARGS > "$LOG_FILE" 2>&1 &
SYNC_PID=$!

# 保存PID和日志文件路径
echo $SYNC_PID > "$PID_FILE"
echo "$LOG_FILE" > "$LOG_INDEX_FILE"

# 等待一下，检查进程是否成功启动
sleep 2

if ps -p "$SYNC_PID" > /dev/null 2>&1; then
    echo "✅ 同步任务已启动 (PID: $SYNC_PID)"
    echo ""
    echo "📋 管理命令:"
    echo "   查看实时日志: tail -f $LOG_FILE"
    echo "   查看最新日志: cat $LOG_INDEX_FILE | xargs tail -f"
    echo "   查看进程: ps -p $SYNC_PID"
    echo "   停止任务: kill $SYNC_PID && rm $PID_FILE $LOG_INDEX_FILE"
    echo ""
    echo "📄 日志文件路径已保存到: $LOG_INDEX_FILE"
    echo "   实时日志地址: $LOG_FILE"
    echo ""
    echo "📄 最近日志:"
    tail -20 "$LOG_FILE"
else
    echo "❌ 同步任务启动失败"
    echo "   查看日志: cat $LOG_FILE"
    rm -f "$PID_FILE" "$LOG_INDEX_FILE"
    exit 1
fi













