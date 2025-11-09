#!/bin/bash

# 验证审批统计修复是否生效
# 使用方法: ./verify-fix.sh

echo "=== 验证审批统计修复 ==="
echo ""

# 检查后端服务器是否运行
if ! pgrep -f "node.*server.js" > /dev/null; then
  echo "❌ 后端服务器未运行"
  echo "请先启动后端服务器: cd backend && npm start"
  exit 1
fi

echo "✅ 后端服务器正在运行"
echo ""

# 检查数据库连接
echo "检查数据库中的审批数据..."
cd "$(dirname "$0")/../backend" || exit 1

# 运行数据库检查脚本
if node scripts/checkApprovalData.js 2>&1 | grep -q "差旅申请总数"; then
  echo "✅ 数据库连接正常"
  echo ""
  
  # 显示数据统计
  node scripts/checkApprovalData.js 2>&1 | grep -E "差旅申请总数|有审批记录的差旅申请数|费用申请总数|有审批记录的费用申请数"
  echo ""
else
  echo "❌ 数据库连接失败"
  exit 1
fi

# 检查API端点
echo "检查API端点..."
API_BASE="http://localhost:5000/api"

# 测试统计API（不需要认证的健康检查）
if curl -s -f "$API_BASE/approvals/statistics" > /dev/null 2>&1; then
  echo "⚠️  统计API需要认证（这是正常的）"
else
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/approvals/statistics")
  if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    echo "✅ 统计API端点可访问（需要认证）"
  else
    echo "❌ 统计API端点异常 (HTTP $STATUS)"
  fi
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "📝 下一步："
echo "1. 在浏览器中访问前端应用"
echo "2. 登录系统"
echo "3. 导航到审批统计页面"
echo "4. 查看是否能正常显示统计数据"
echo ""
echo "如需详细测试，请使用："
echo "  ./test-approval-statistics.sh <your-auth-token>"
echo "或"
echo "  node test-stats-simple.js <your-auth-token>"
echo ""
echo "查看修复详情："
echo "  cat ../APPROVAL_STATISTICS_FIX.md"

