# Railway 部署快速修复

## ❌ 错误信息
```
The executable `cd` could not be found.
```

## ✅ 解决方案

Railway 容器环境不支持 `cd` 命令，需要在 Railway Dashboard 中手动配置。

### 步骤 1：在 Railway Dashboard 配置

1. **进入 Railway Dashboard**
   - 选择你的服务
   - 点击 **Settings**

2. **设置 Root Directory**
   - 找到 **Root Directory** 设置
   - 设置为：`backend`
   - 这样 Railway 会直接将工作目录设置为 `backend`

3. **设置 Build Command**
   - 设置为：`npm install`
   - 或留空（Railway 会自动检测）

4. **设置 Start Command**
   - 设置为：`npm start`
   - 因为 Root Directory 已经是 `backend`，不需要 `cd`

### 步骤 2：配置环境变量

在 **Variables** 标签中添加：

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority
JWT_SECRET=your-strong-jwt-secret-here
FRONTEND_URL=https://traveroa.netlify.app
```

⚠️ **重要**：不要设置 `PORT`，Railway 会自动提供。

### 步骤 3：重新部署

1. 保存所有设置
2. 点击 **Redeploy** 或推送代码触发自动部署

## 📋 Railway Dashboard 设置总结

| 设置项 | 值 |
|--------|-----|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

## ✅ 验证部署成功

查看日志应该看到：
```
📦 MongoDB Connected: cluster0.xxxxx.mongodb.net
🚀 Server running in production mode on port XXXX
```

## 🔄 如果还是失败

1. **清除构建缓存**
   - Settings > **Clear Build Cache**
   - 重新部署

2. **检查环境变量**
   - 确认所有必需的环境变量都已设置
   - 确认 `MONGODB_URI` 格式正确

3. **查看完整日志**
   - Deployments > 点击失败的部署 > Logs
   - 查找具体错误信息

