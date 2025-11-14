# 部署指南

本项目是一个全栈应用，包含 React 前端和 Node.js 后端。以下是几种部署方案：

## 🚀 部署方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **Vercel** | 前端部署（推荐） | 免费、自动部署、CDN加速 | 后端需单独部署 |
| **Railway** | 全栈部署 | 简单、免费额度 | 可能需要付费 |
| **Render** | 全栈部署 | 免费计划、简单配置 | 免费计划有休眠限制 |
| **DigitalOcean App Platform** | 生产环境 | 稳定、可扩展 | 需付费 |
| **Docker + 云服务器** | 完全控制 | 灵活、成本可控 | 需要运维知识 |

## 📋 方案一：Vercel + Railway（推荐）

### 前端部署到 Vercel

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **部署前端**
```bash
cd frontend
vercel
```

3. **在 Vercel 控制台配置环境变量**
- `REACT_APP_API_URL`: 后端 API 地址

### 后端部署到 Railway

1. **访问 [Railway](https://railway.app)**
2. **连接 GitHub 仓库**
3. **选择项目根目录，配置启动命令：**
   ```
   cd backend && npm install && npm start
   ```
4. **配置环境变量：**
   - `MONGODB_URI`: MongoDB 连接字符串
   - `JWT_SECRET`: JWT 密钥
   - `NODE_ENV`: production
   - `PORT`: 3001
   - `FRONTEND_URL`: 前端 Vercel URL

## 📋 方案二：Render（免费全栈部署）

1. **访问 [Render](https://render.com)**
2. **创建两个 Web 服务**

### 后端服务
- **构建命令**: `cd backend && npm install`
- **启动命令**: `cd backend && npm start`
- **环境变量**:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - `PORT=3001`

### 前端服务
- **类型**: Static Site
- **构建命令**: `cd frontend && npm install && npm run build`
- **发布目录**: `frontend/build`
- **环境变量**:
  - `REACT_APP_API_URL`: 后端服务 URL

## 📋 方案三：Docker 部署

### 构建镜像
```bash
docker build -t travel-expense-system .
```

### 运行容器
```bash
docker run -d \
  -p 3001:3001 \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  -e NODE_ENV=production \
  travel-expense-system
```

### Docker Compose（包含 MongoDB）
```bash
docker-compose up -d
```

## 📋 方案四：GitHub Pages（仅前端，不推荐）

GitHub Pages 只能部署静态网站，需要：
1. 修改前端构建配置，设置 `homepage` 为 GitHub Pages URL
2. 后端需单独部署到其他平台

```json
// frontend/package.json
{
  "homepage": "https://yourusername.github.io/OA"
}
```

然后使用 GitHub Actions 自动部署到 GitHub Pages。

## 🔧 环境变量配置

### 后端环境变量
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://your-frontend.vercel.app
```

### 前端环境变量
```env
REACT_APP_API_URL=https://your-backend.railway.app
```

## 🗄️ 数据库部署

### MongoDB Atlas（推荐）
1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建免费集群
3. 获取连接字符串
4. 配置网络访问白名单

### Railway MongoDB
Railway 提供一键部署 MongoDB，可以直接使用。

## 📝 部署检查清单

- [ ] 环境变量已正确配置
- [ ] 数据库连接正常
- [ ] CORS 配置允许前端域名
- [ ] 前端 API 地址指向正确后端
- [ ] HTTPS 已启用
- [ ] 敏感信息使用环境变量，不提交到代码库

## 🔍 常见问题

### 问题：CORS 错误
**解决**：在 `backend/server.js` 中配置 CORS：
```javascript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})
```

### 问题：前端无法连接后端
**解决**：确保 `REACT_APP_API_URL` 环境变量正确设置，并使用 HTTPS。

### 问题：数据库连接失败
**解决**：检查 MongoDB Atlas 网络访问白名单，确保允许所有 IP 或部署服务器 IP。

## 🎯 推荐部署流程

1. **开发环境测试** → 本地验证
2. **生产环境构建** → `npm run build`
3. **数据库准备** → MongoDB Atlas
4. **后端部署** → Railway/Render
5. **前端部署** → Vercel
6. **域名配置** → （可选）自定义域名

---

**注意**：首次部署建议使用免费服务（Railway、Render、Vercel）进行测试，确认无误后再考虑付费方案用于生产环境。

