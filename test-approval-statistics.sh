#!/bin/bash

# 测试审批统计API
# 使用方法: ./test-approval-statistics.sh <token>

TOKEN=$1

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <auth_token>"
  echo "请提供认证token"
  exit 1
fi

BASE_URL="http://localhost:5000/api"

echo "=== 测试审批统计API ==="
echo ""

# 计算日期范围（最近30天）
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d 2>/dev/null)

echo "日期范围: $START_DATE 到 $END_DATE"
echo ""

# 测试1: 获取所有类型的统计
echo "1. 测试获取所有类型的统计..."
curl -s -X GET "$BASE_URL/approvals/statistics?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# 测试2: 获取差旅统计
echo "2. 测试获取差旅统计..."
curl -s -X GET "$BASE_URL/approvals/statistics?startDate=$START_DATE&endDate=$END_DATE&type=travel" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# 测试3: 获取费用统计
echo "3. 测试获取费用统计..."
curl -s -X GET "$BASE_URL/approvals/statistics?startDate=$START_DATE&endDate=$END_DATE&type=expense" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# 测试4: 获取审批人工作量
echo "4. 测试获取审批人工作量..."
curl -s -X GET "$BASE_URL/approvals/approver-workload?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

# 测试5: 获取趋势数据
echo "5. 测试获取趋势数据..."
curl -s -X GET "$BASE_URL/approvals/trend?startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo "---"
echo ""

echo "=== 测试完成 ==="

