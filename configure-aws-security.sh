#!/bin/bash

# AWS 安全组配置脚本
# 此脚本需要在本地运行（已配置 AWS CLI 和凭证）

set -e

echo "=========================================="
echo "🔧 AWS 安全组配置工具"
echo "=========================================="

# 服务器 IP
SERVER_IP="3.25.195.251"
PORT="3001"

# 获取实例信息
echo "📋 获取 EC2 实例信息..."
INSTANCE_INFO=$(aws ec2 describe-instances \
  --filters "Name=ip-address,Values=$SERVER_IP" \
  --query "Reservations[0].Instances[0].[InstanceId,SecurityGroups[0].GroupId]" \
  --output text 2>/dev/null)

if [ -z "$INSTANCE_INFO" ] || [ "$INSTANCE_INFO" == "None" ]; then
  echo "❌ 无法找到实例，请检查："
  echo "   1. AWS CLI 已安装并配置凭证"
  echo "   2. 实例 IP 地址正确: $SERVER_IP"
  echo "   3. 你有权限访问该实例"
  echo ""
  echo "💡 手动配置方法："
  echo "   查看 AWS_SECURITY_GROUP_CONFIG.md 文件"
  exit 1
fi

INSTANCE_ID=$(echo $INSTANCE_INFO | awk '{print $1}')
SG_ID=$(echo $INSTANCE_INFO | awk '{print $2}')

echo "✅ 找到实例:"
echo "   实例 ID: $INSTANCE_ID"
echo "   安全组 ID: $SG_ID"
echo ""

# 检查端口是否已开放
echo "🔍 检查端口 $PORT 是否已开放..."
EXISTING_RULE=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`$PORT\` && ToPort==\`$PORT\`]" \
  --output json)

if [ "$EXISTING_RULE" != "[]" ] && [ -n "$EXISTING_RULE" ]; then
  echo "✅ 端口 $PORT 已开放"
  echo ""
  echo "当前规则:"
  echo "$EXISTING_RULE" | jq '.' 2>/dev/null || echo "$EXISTING_RULE"
else
  echo "⚠️  端口 $PORT 未开放"
  echo ""
  read -p "是否要添加端口 $PORT 的入站规则？(y/n): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "➕ 添加安全组规则..."
    
    # 询问源 IP
    read -p "允许的源 IP (留空表示允许所有: 0.0.0.0/0): " SOURCE_IP
    SOURCE_IP=${SOURCE_IP:-0.0.0.0/0}
    
    # 添加规则
    aws ec2 authorize-security-group-ingress \
      --group-id $SG_ID \
      --protocol tcp \
      --port $PORT \
      --cidr $SOURCE_IP \
      --description "OA Application Frontend & Backend" \
      && echo "✅ 安全组规则已添加！" \
      || echo "❌ 添加规则失败，可能已存在或权限不足"
  fi
fi

echo ""
echo "=========================================="
echo "📝 配置完成！"
echo "=========================================="
echo ""
echo "🌐 前端访问地址:"
echo "   http://$SERVER_IP:$PORT"
echo ""
echo "🧪 测试连接:"
echo "   curl -I http://$SERVER_IP:$PORT/health"
echo ""
echo "💡 提示："
echo "   - 如果仍无法访问，请检查服务器防火墙"
echo "   - 等待 1-2 分钟让规则生效"
echo ""



