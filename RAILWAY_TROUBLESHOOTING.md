# Railway 部署故障快速排查

## 🚨 常见错误及解决方案

### 1. 构建失败 - "Cannot find module"

**错误信息**：
```
Error: Cannot find module 'express'
```

**解决方案**：
- ✅ 已更新 `railway.json`，包含 `buildCommand`
- 确认 Railway 读取了 `railway.json` 配置文件
- 如果手动配置，确保 Build Command 为：`cd backend && npm install`

### 2. 启动失败 - "Cannot find module './server.js'"

**错误信息**：
```
Error: Cannot find module './server.js'
```

**原因**：工作目录不正确

**解决方案**：
- ✅ 已在 `railway.json` 配置 `startCommand: "cd backend && npm start"`
- 或在 Railway Dashboard 设置：
  - Root Directory: 留空（项目根目录）
  - Start Command: `cd backend && npm start`

### 3. 端口错误 - "EADDRINUSE"

**错误信息**：
```
Error: listen EADDRINUSE :::3001
```

**解决方案**：
- ✅ 代码已正确使用 `process.env.PORT || 3001`
- ⚠️ **不要在 Railway 环境变量中设置 PORT**
- Railway 会自动设置 `PORT` 环境变量

### 4. 数据库连接失败

**错误信息**：
```
MongooseError: Operation timed out
```

**解决方案**：

**步骤 1：检查环境变量**
在 Railway Dashboard > Variables 确认：
```
MONGODB_URI=mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority
```

**步骤 2：检查 MongoDB Atlas 白名单**
1. 登录 MongoDB Atlas
2. Network Access > Add IP Address
3. 选择 **Allow Access from Anywhere** (`0.0.0.0/0`)
4. 保存

**步骤 3：验证连接字符串**
```bash
# 本地测试
cd backend
MONGODB_URI="mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority" node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ 连接成功')).catch(e => console.error('❌', e.message))"
```

### 5. 启动命令找不到目录

**错误信息**：
```
/bin/sh: cd: backend: No such file or directory
```

**解决方案**：
- **选项 A**: Root Directory 留空，Start Command: `cd backend && npm start`
- **选项 B**: Root Directory 设为 `backend`，Start Command: `npm start`

### 6. 依赖安装失败

**错误信息**：
```
npm ERR! code ECONNREFUSED
```

**解决方案**：
- 清除 Railway 构建缓存
- 重新部署
- 检查网络连接

## 📋 Railway 配置检查清单

### 在 Railway Dashboard 中检查：

**Settings > General**
- [ ] Root Directory: **留空** 或 `.`
- [ ] Build Command: `cd backend && npm install`（或使用 railway.json）
- [ ] Start Command: `cd backend && npm start`（或使用 railway.json）

**Variables**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` 已设置（完整连接字符串）
- [ ] `JWT_SECRET` 已设置（不要使用默认值）
- [ ] `FRONTEND_URL` 已设置（https://traveroa.netlify.app）
- [ ] **不要设置** `PORT`（Railway 自动提供）

## 🔧 快速修复步骤

### 如果部署失败：

1. **查看日志**
   ```
   Railway Dashboard > Deployments > [最新部署] > Logs
   ```

2. **根据错误信息修复**

3. **常见修复**：
   - 环境变量缺失 → 添加环境变量
   - 构建失败 → 检查 railway.json 或手动设置 Build Command
   - 启动失败 → 检查 Start Command 和工作目录
   - 数据库连接失败 → 检查 MONGODB_URI 和 Atlas 白名单

4. **重新部署**
   - 推送代码到 GitHub（自动触发）
   - 或点击 Railway Dashboard 的 **Redeploy**

## ✅ 部署成功标志

查看 Railway 日志，应该看到：

```
📦 MongoDB Connected: cluster0.xxxxx.mongodb.net
🚀 Server running in production mode on port XXXX
📊 Health check: http://localhost:XXXX/health
```

## 🎯 验证部署

1. **访问健康检查**
   ```
   https://your-app.up.railway.app/health
   ```
   应该返回：`{"status":"ok"}`

2. **测试 API**
   ```
   https://your-app.up.railway.app/api/health
   ```

3. **获取服务 URL**
   - Railway Dashboard > Settings > Domains
   - 复制生成的 URL
   - 在 Netlify 配置 `REACT_APP_API_URL` 为这个 URL

## 📞 需要帮助？

如果以上方法都无法解决：

1. **复制完整的错误日志**
2. **检查环境变量是否正确**
3. **确认 MongoDB Atlas 白名单已配置**
4. **查看 RAILWAY_DEPLOYMENT.md 详细指南**

