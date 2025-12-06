#!/bin/bash

# 同步后30个国家的简化脚本
# 直接在服务器上执行，逐个同步

cd /home/ec2-user/travel/backend

# 加载Node.js环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20.16.0 2>/dev/null

# 后30个国家的ID列表
COUNTRY_IDS=(4 219 12 243 53 178 61 69 28 275 186 20 105 146 101 89 158 93 73 166 174 259 77 162 85 81 684367 66 264 33)

LOG_FILE="logs/sync-last-30-$(date +%Y%m%d-%H%M%S).log"

echo "开始同步后30个国家..." | tee -a "$LOG_FILE"
echo "日志文件: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

SUCCESS=0
FAILED=0

for i in "${!COUNTRY_IDS[@]}"; do
    COUNTRY_ID="${COUNTRY_IDS[$i]}"
    NUM=$((i + 1))
    
    echo "[$NUM/30] 同步国家 ID: $COUNTRY_ID" | tee -a "$LOG_FILE"
    
    if node scripts/syncGlobalLocations.js --country-id "$COUNTRY_ID" >> "$LOG_FILE" 2>&1; then
        echo "  ✅ 成功" | tee -a "$LOG_FILE"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "  ❌ 失败" | tee -a "$LOG_FILE"
        FAILED=$((FAILED + 1))
    fi
    
    echo "" | tee -a "$LOG_FILE"
    
    # 每个国家之间延迟2秒
    if [ $NUM -lt 30 ]; then
        sleep 2
    fi
done

echo "============================================================" | tee -a "$LOG_FILE"
echo "同步完成！成功: $SUCCESS, 失败: $FAILED" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"




