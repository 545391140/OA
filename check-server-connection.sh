#!/bin/bash

# AWS EC2 连接诊断脚本

echo "🔍 AWS EC2 连接诊断"
echo "===================="
echo ""

# 从配置文件读取服务器信息
if [ -f "deploy.config" ]; then
    source deploy.config
else
    echo "❌ 未找到 deploy.config 文件"
    exit 1
fi

echo "服务器信息:"
echo "  IP: $SERVER_HOST"
echo "  用户: $SERVER_USER"
echo "  SSH 密钥: $SSH_KEY"
echo ""

# 1. Ping 测试
echo "1️⃣ Ping 测试..."
if ping -c 2 -W 2 "$SERVER_HOST" &>/dev/null; then
    echo "   ✅ 服务器可达"
else
    echo "   ❌ 服务器不可达（可能已停止或安全组阻止 ICMP）"
fi
echo ""

# 2. 端口测试
echo "2️⃣ SSH 端口 (22) 测试..."
if nc -zv -w 5 "$SERVER_HOST" 22 &>/dev/null; then
    echo "   ✅ SSH 端口开放"
else
    echo "   ❌ SSH 端口无法连接"
    echo "   可能原因："
    echo "     - AWS 安全组未开放端口 22"
    echo "     - EC2 实例已停止"
    echo "     - IP 地址已更改"
fi
echo ""

# 3. SSH 连接测试
echo "3️⃣ SSH 连接测试..."
if [ -n "$SSH_KEY" ]; then
    SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"
    if [ -f "$SSH_KEY_EXPANDED" ]; then
        if ssh -i "$SSH_KEY_EXPANDED" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "echo 'SSH连接成功'" &>/dev/null; then
            echo "   ✅ SSH 连接成功"
        else
            echo "   ❌ SSH 连接失败"
            echo "   请检查："
            echo "     - AWS 安全组是否允许 SSH (端口 22)"
            echo "     - EC2 实例状态是否为 running"
            echo "     - SSH 密钥文件权限: chmod 400 $SSH_KEY_EXPANDED"
        fi
    else
        echo "   ⚠️  SSH 密钥文件不存在: $SSH_KEY_EXPANDED"
    fi
else
    echo "   ⚠️  未配置 SSH 密钥"
fi
echo ""

# 4. 建议
echo "📋 建议操作："
echo ""
echo "1. 检查 AWS EC2 控制台："
echo "   - 确认实例状态为 'running'"
echo "   - 检查公有 IPv4 地址是否为: $SERVER_HOST"
echo ""
echo "2. 检查安全组设置："
echo "   - 入站规则中应允许 SSH (端口 22)"
echo "   - 来源可以是：My IP 或 0.0.0.0/0（测试用）"
echo ""
echo "3. 如果 IP 地址已更改，更新 deploy.config："
echo "   SERVER_HOST=\"新的IP地址\""
echo ""







