# Railway 后端部署指南

## 🚀 快速开始

### 1. 连接 GitHub 仓库

1. 访问 [Railway](https://railway.app)
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 授权并选择仓库 `OA`

### 2. 配置服务设置

在 Railway Dashboard 中配置：

#### Root Directory（根目录）
- **留空** 或设置为 `.`（项目根目录）

#### Build Command（构建命令）
```bash
cd backend && npm install
```

#### Start Command（启动命令）
```bash
cd backend && npm start
```

**或者使用 railway.json 配置**（已在项目中配置）：
- Railway 会自动读取 `railway.json` 配置
- 如果使用配置文件，无需手动设置上述命令

### 3. 配置环境变量

在 Railway Dashboard > **Variables** 中添加：

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority
JWT_SECRET=your-strong-jwt-secret-change-this-in-production
FRONTEND_URL=https://traveroa.netlify.app
```

⚠️ **重要**：
- `PORT` 可以设置为 `3001`，但 Railway 会自动提供 `PORT` 环境变量
- 如果 Railway 自动设置了 `PORT`，可以删除或保留（不会冲突）
- `MONGODB_URI` 必须正确配置

## 🔍 故障排查

### 错误 1: Build Failed - npm install 失败

**错误信息**：
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```

**解决方案**：
1. 检查 **Root Directory** 是否正确（应留空或 `.`）
2. 确认 `backend/package.json` 存在且格式正确
3. 查看构建日志，找到具体错误

### 错误 2: Module not found

**错误信息**：
```
Error: Cannot find module 'xxx'
```

**解决方案**：
1. 确认构建命令包含 `npm install`
2. 检查 `backend/package.json` 依赖是否完整
3. 清除 Railway 构建缓存并重新部署

### 错误 3: Port already in use 或 EADDRINUSE

**错误信息**：
```
Error: listen EADDRINUSE :::3001
```

**解决方案**：
1. Railway 会自动设置 `PORT` 环境变量
2. 在代码中使用 `process.env.PORT || 3001`（已正确配置）
3. **不要**在 Railway 中手动设置 `PORT=3001`（让 Railway 自动分配）

### 错误 4: Database connection failed

**错误信息**：
```
MongooseError: Operation timed out
❌ Database connection error
```

**解决方案**：
1. 检查 `MONGODB_URI` 环境变量是否正确
2. 确认 MongoDB Atlas 网络白名单允许 Railway IP
   - 在 MongoDB Atlas > Network Access > Add IP Address
   - 选择 **Allow Access from Anywhere** (`0.0.0.0/0`) 或添加 Railway IP
3. 验证用户名和密码正确
4. 确认数据库名正确

### 错误 5: Start command failed

**错误信息**：
```
/bin/sh: cd: backend: No such file or directory
```

**解决方案**：
1. 检查 Root Directory 设置
2. 如果 Root Directory 设置为 `backend`，则启动命令应为：`npm start`
3. 如果 Root Directory 留空，则启动命令应为：`cd backend && npm start`

### 错误 6: Application failed to respond

**错误信息**：
```
Application failed to respond
```

**解决方案**：
1. 确认服务器监听在正确的端口（`process.env.PORT`）
2. 检查服务器是否正常启动（查看日志）
3. 确认健康检查端点可访问：`/health` 或 `/api/health`

## 📋 Railway 配置检查清单

### 服务配置
- [ ] Root Directory: 留空（使用项目根目录）
- [ ] Build Command: `cd backend && npm install`（或使用 railway.json）
- [ ] Start Command: `cd backend && npm start`（或使用 railway.json）

### 环境变量
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` 已配置（完整连接字符串）
- [ ] `JWT_SECRET` 已配置（强密码）
- [ ] `FRONTEND_URL` 已配置（前端地址）

### 数据库
- [ ] MongoDB Atlas 网络白名单已配置
- [ ] 数据库用户权限正确
- [ ] 连接字符串格式正确

## 🛠️ 详细配置步骤

### 方法一：使用 Railway Dashboard（推荐）

1. **创建新服务**
   - 在项目页面点击 **New** > **Service**
   - 选择 **GitHub Repo** > 选择仓库

2. **设置根目录**
   - Settings > **Root Directory** > 留空或 `.`

3. **配置构建和启动**
   - Settings > **Build Command**: `cd backend && npm install`
   - Settings > **Start Command**: `cd backend && npm start`

4. **添加环境变量**
   - Variables 标签 > Add Variable
   - 逐一添加所有必需的环境变量

### 方法二：使用 railway.json（自动化）

项目已包含 `railway.json` 配置文件，Railway 会自动读取。

**优点**：
- 配置版本化
- 团队协作更方便
- 自动应用配置

**railway.json 内容**：
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🔧 修复常见问题

### 问题：部署后无法访问

1. **检查端口配置**
   ```javascript
   // backend/server.js 中应该使用
   const PORT = process.env.PORT || 3001;
   ```
   已正确配置 ✅

2. **检查健康检查端点**
   访问：`https://your-app.railway.app/health`
   应该返回：`{ "status": "ok" }`

3. **查看 Railway 日志**
   - Railway Dashboard > Deployments > 点击最新部署 > Logs
   - 查看是否有错误信息

### 问题：构建时间过长

1. 使用 `.railwayignore` 排除不必要文件
2. 优化构建命令，只安装生产依赖

## 📝 环境变量模板

复制以下内容到 Railway Variables：

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority
JWT_SECRET=your-strong-random-secret-key-here-min-32-chars
FRONTEND_URL=https://traveroa.netlify.app
```

⚠️ **重要**：
- `PORT` 不需要手动设置，Railway 会自动提供
- `JWT_SECRET` 应该使用强随机字符串（至少 32 位）
- 不要在 `MONGODB_URI` 前后添加引号或空格

## 🎯 验证部署

部署成功后：

1. **检查日志**
   - Railway Dashboard > Deployments > Logs
   - 应该看到：`🚀 Server running in production mode on port XXXX`

2. **测试健康检查**
   ```bash
   curl https://your-app.railway.app/health
   ```
   应该返回：`{"status":"ok"}`

3. **测试 API**
   ```bash
   curl https://your-app.railway.app/api/health
   ```
   应该返回 API 状态

4. **获取服务 URL**
   - Railway Dashboard > Settings > Domains
   - 复制生成的 URL（如：`https://your-app.up.railway.app`）
   - 在 Netlify 中配置 `REACT_APP_API_URL` 为这个 URL

## 🔄 重新部署

如果部署失败：

1. **查看部署日志**
   - Railway Dashboard > Deployments
   - 点击失败的部署，查看详细日志

2. **修复问题**
   - 根据错误信息修复代码或配置
   - 更新环境变量

3. **重新部署**
   - 推送代码到 GitHub（自动触发）
   - 或手动点击 **Redeploy**

## 📞 需要帮助？

如果仍然遇到问题：

1. **检查 Railway 日志**
   - 复制完整的错误信息

2. **验证配置**
   - 使用本文档的检查清单

3. **查看 Railway 文档**
   - https://docs.railway.app

---

**提示**：首次部署可能需要几分钟时间，请耐心等待构建和启动完成。

