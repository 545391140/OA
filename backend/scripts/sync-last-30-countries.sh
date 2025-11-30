#!/bin/bash

# 同步后30个国家的数据脚本
# 使用方法: ./sync-last-30-countries.sh

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/.."
LOG_DIR="$BACKEND_DIR/logs"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 进入后端目录
cd "$BACKEND_DIR"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    exit 1
fi

# 后30个国家的ID列表（需要先获取）
# 这里先获取国家列表，然后提取后30个
echo "🔍 获取国家列表..."
COUNTRY_IDS=$(node -e "
require('dotenv').config();
const ctripApiService = require('./services/ctripApiService');
(async () => {
  try {
    const countries = await ctripApiService.getAllCountries('zh-CN');
    const last30 = countries.slice(-30);
    const ids = last30.map(c => c.countryId);
    // 只输出ID，不输出其他信息
    console.log(ids.join(' '));
    process.exit(0);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
})();
" 2>/dev/null | grep -E '^[0-9]' | head -1)

if [ -z "$COUNTRY_IDS" ]; then
    echo "❌ 获取国家列表失败"
    exit 1
fi

# 转换为数组
read -a COUNTRY_ARRAY <<< "$COUNTRY_IDS"

echo "✓ 找到 ${#COUNTRY_ARRAY[@]} 个国家"
echo ""

# 创建主日志文件
MAIN_LOG="$LOG_DIR/sync-last-30-countries-$(date +%Y%m%d-%H%M%S).log"

# 开始同步
echo "🚀 开始同步后30个国家的数据..."
echo "   主日志文件: $MAIN_LOG"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_COUNTRIES=()

for i in "${!COUNTRY_ARRAY[@]}"; do
    COUNTRY_ID="${COUNTRY_ARRAY[$i]}"
    COUNTRY_NUM=$((i + 1))
    
    echo "[$COUNTRY_NUM/30] 同步国家 ID: $COUNTRY_ID"
    
    # 为每个国家创建单独的日志文件
    COUNTRY_LOG="$LOG_DIR/sync-country-$COUNTRY_ID-$(date +%Y%m%d-%H%M%S).log"
    
    # 执行同步（前台执行，等待完成）
    if node "$SCRIPT_DIR/syncGlobalLocations.js" --country-id "$COUNTRY_ID" > "$COUNTRY_LOG" 2>&1; then
        echo "  ✅ 成功"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        
        # 提取统计信息
        STATS=$(tail -10 "$COUNTRY_LOG" | grep -E "(总地理位置数据|创建|跳过)" | head -3)
        if [ ! -z "$STATS" ]; then
            echo "$STATS" | while read line; do
                echo "    $line"
            done
        fi
    else
        echo "  ❌ 失败"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_COUNTRIES+=("$COUNTRY_ID")
        
        # 显示错误信息
        ERROR=$(tail -5 "$COUNTRY_LOG" | grep -i "error\|失败\|失败" | head -1)
        if [ ! -z "$ERROR" ]; then
            echo "    错误: $ERROR"
        fi
    fi
    
    # 记录到主日志
    echo "[$COUNTRY_NUM/30] 国家ID: $COUNTRY_ID - $(if [ $? -eq 0 ]; then echo '成功'; else echo '失败'; fi)" >> "$MAIN_LOG"
    
    # 每个国家之间延迟2秒，避免API请求过快
    if [ $COUNTRY_NUM -lt 30 ]; then
        sleep 2
    fi
    
    echo ""
done

# 输出最终统计
echo "============================================================"
echo "同步完成！最终统计:"
echo "============================================================"
echo "总国家数: 30"
echo "成功: $SUCCESS_COUNT"
echo "失败: $FAILED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
    echo ""
    echo "失败的国家ID:"
    for country_id in "${FAILED_COUNTRIES[@]}"; do
        echo "  - $country_id"
    done
fi

echo "============================================================"
echo "主日志文件: $MAIN_LOG"
echo "============================================================"

