#!/bin/bash

# 测试Dashboard API
echo "Testing Dashboard API..."
echo ""

# 检查后端服务器是否运行
if ! lsof -ti:5000 > /dev/null 2>&1; then
    echo "❌ 后端服务器未运行在端口5000"
    echo "请先启动后端服务器："
    echo "  cd backend && npm start"
    exit 1
fi

echo "✅ 后端服务器正在运行"
echo ""

# 测试Dashboard API（需要认证）
echo "📊 测试Dashboard API..."
echo "注意：此API需要认证token"
echo ""
echo "请在浏览器中："
echo "1. 打开 http://localhost:3000"
echo "2. 登录系统"
echo "3. 打开浏览器开发者工具 (F12)"
echo "4. 查看Console中的错误信息"
echo ""
echo "或者使用以下curl命令测试（需要替换YOUR_TOKEN）："
echo ""
echo "curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:5000/api/dashboard"
echo ""

# 检查路由是否注册
echo "🔍 检查Dashboard路由文件..."
if [ -f "backend/routes/dashboard.js" ]; then
    echo "✅ Dashboard路由文件存在"
else
    echo "❌ Dashboard路由文件不存在"
fi

if [ -f "backend/controllers/dashboardController.js" ]; then
    echo "✅ Dashboard控制器文件存在"
else
    echo "❌ Dashboard控制器文件不存在"
fi

echo ""
echo "📝 后端日志位置: backend/server.log"
echo "请查看日志以获取更多错误信息"

