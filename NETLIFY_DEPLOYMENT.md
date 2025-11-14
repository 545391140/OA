# Netlify 部署指南

## 📋 部署架构

由于 Netlify 只能托管静态网站，需要将前端和后端分开部署：

- **前端**: Netlify (https://traveroa.netlify.app)
- **后端**: Railway、Render 或其他支持 Node.js 的平台

## 🚀 第一步：部署后端

### 选项 1：Railway（推荐）

1. 访问 [Railway](https://railway.app)
2. 连接 GitHub 仓库
3. 创建新项目，选择仓库
4. 配置服务：
   - **Root Directory**: 留空（使用项目根目录）
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   
5. 配置环境变量（Railway Dashboard > Variables）：
   ```env
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   JWT_SECRET=your-strong-secret-key-here
   FRONTEND_URL=https://traveroa.netlify.app
   ```

6. 等待部署完成，获取后端 URL（如：`https://your-app.railway.app`）

### 选项 2：Render

1. 访问 [Render](https://render.com)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 配置：
   - **Name**: `travel-expense-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Root Directory**: 留空

5. 配置环境变量（同 Railway）
6. 获取后端 URL（如：`https://travel-expense-backend.onrender.com`）

## 🎨 第二步：配置 Netlify

### 1. 在 Netlify 控制台配置环境变量

1. 进入 Netlify Dashboard
2. 选择你的站点 (`traveroa`)
3. 进入 **Site settings** > **Environment variables**
4. 添加以下环境变量：

```env
REACT_APP_API_URL=https://your-backend-url.railway.app
```

⚠️ **重要**：将 `https://your-backend-url.railway.app` 替换为实际的后端 URL

### 2. 配置构建设置

在 Netlify Dashboard > **Site settings** > **Build & deploy** > **Build settings**：

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/build`

或者使用 `netlify.toml` 配置文件（已创建）

### 3. 重新部署

在 Netlify Dashboard：
1. 进入 **Deploys** 标签
2. 点击 **Trigger deploy** > **Clear cache and deploy site**

## ✅ 验证部署

### 1. 检查环境变量

在浏览器控制台运行：
```javascript
console.log('API URL:', process.env.REACT_APP_API_URL);
```

### 2. 检查 API 连接

打开浏览器开发者工具 > Network：
- 登录时应该看到请求发送到：`https://your-backend-url.railway.app/api/auth/login`
- 而不是：`https://traveroa.netlify.app/api/auth/login`

### 3. 测试登录

使用默认账户：
- 邮箱: `admin@company.com`
- 密码: `admin123456`

## 🔍 故障排除

### 问题 1：仍然请求 `traveroa.netlify.app/api/auth/login`

**原因**: 环境变量未正确配置或构建时未读取

**解决**:
1. 确认 Netlify 环境变量已设置 `REACT_APP_API_URL`
2. 清除构建缓存并重新部署
3. 检查构建日志，确认环境变量被读取

### 问题 2：CORS 错误

**原因**: 后端未允许 Netlify 域名

**解决**: 在后端环境变量中设置：
```env
FRONTEND_URL=https://traveroa.netlify.app
```

### 问题 3：404 Not Found

**原因**: 后端未启动或 URL 配置错误

**解决**:
1. 检查后端服务是否运行（访问后端健康检查端点）
2. 确认 `REACT_APP_API_URL` 指向正确的后端地址
3. 检查后端日志是否有错误

### 问题 4：环境变量未生效

**原因**: React 环境变量需要在构建时设置

**解决**:
1. 确保变量名以 `REACT_APP_` 开头
2. 重新部署（环境变量更改后需要重新构建）
3. 清除 Netlify 构建缓存

## 📝 Netlify 环境变量设置步骤（详细）

1. **登录 Netlify Dashboard**
   - https://app.netlify.com

2. **选择你的站点**
   - 点击站点名称

3. **进入设置**
   - 点击 **Site settings**

4. **找到环境变量**
   - 左侧菜单 > **Environment variables**

5. **添加变量**
   - 点击 **Add a variable**
   - Key: `REACT_APP_API_URL`
   - Value: 你的后端 URL（如：`https://your-app.railway.app`）
   - **重要**: 不要添加尾随斜杠 `/`

6. **保存并重新部署**
   - 点击 **Save**
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** > **Clear cache and deploy site**

## 🔄 自动化部署

如果使用 GitHub 连接：

1. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **Netlify 自动部署**
   - Netlify 会自动检测并部署新版本
   - 确保在 **Build settings** 中配置了正确的构建命令

## 📞 需要帮助？

如果遇到问题：
1. 检查 Netlify 构建日志
2. 检查后端服务器日志
3. 使用浏览器开发者工具查看网络请求
4. 确认环境变量已正确配置

---

**重要提醒**：
- 前端和后端必须分别部署
- `REACT_APP_API_URL` 必须指向实际的后端服务器
- 环境变量更改后需要重新部署前端才能生效

