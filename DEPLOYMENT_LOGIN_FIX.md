# 部署后无法登录问题修复指南

## 🔍 问题诊断

部署后无法登录的常见原因：

### 1. **前端 API 地址配置错误**

**问题**: 前端使用相对路径 `/api/auth/login`，在生产环境中无法找到后端服务。

**解决方案**: 
- 配置 `REACT_APP_API_URL` 环境变量
- 使用统一的 axios 配置

### 2. **CORS 跨域问题**

**问题**: 前端和后端不在同一域名，浏览器阻止请求。

**解决方案**: 
- 后端配置正确的 `FRONTEND_URL` 环境变量
- 确保 CORS 允许前端域名

### 3. **JWT_SECRET 未配置**

**问题**: 后端 JWT 验证失败。

**解决方案**: 
- 配置 `JWT_SECRET` 环境变量

### 4. **数据库中没有用户**

**问题**: 新部署的数据库没有用户账户。

**解决方案**: 
- 运行初始化脚本创建默认用户

## 🛠️ 修复步骤

### 步骤 1: 配置前端环境变量

在部署平台（如 Vercel、Render）配置环境变量：

```env
REACT_APP_API_URL=https://your-backend-url.com
```

**Vercel 配置**:
1. 进入项目设置 → Environment Variables
2. 添加 `REACT_APP_API_URL`
3. 值为后端 API 地址（如 `https://your-app.railway.app`）

**Render 配置**:
1. 进入服务设置 → Environment
2. 添加 `REACT_APP_API_URL`

### 步骤 2: 配置后端环境变量

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-strong-secret-key-here
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### 步骤 3: 创建默认用户

在服务器上运行：

```bash
cd backend
node scripts/initDefaultUser.js
```

**默认登录信息**:
- 邮箱: `admin@company.com`
- 密码: `admin123456`
- ⚠️ **首次登录后立即修改密码！**

### 步骤 4: 验证配置

#### 检查前端
1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签
3. 尝试登录，检查请求 URL 是否正确
4. 查看 Console 是否有错误信息

#### 检查后端
1. 查看后端日志
2. 确认数据库连接成功
3. 确认 CORS 配置正确

## 🐛 常见错误及解决方案

### 错误 1: `Network Error` 或 `CORS Error`

**原因**: 
- 前端 API URL 配置错误
- CORS 未允许前端域名

**解决**:
1. 检查 `REACT_APP_API_URL` 是否正确
2. 检查后端 `FRONTEND_URL` 是否包含前端域名
3. 检查后端 CORS 配置

### 错误 2: `401 Unauthorized` 或 `Invalid credentials`

**原因**: 
- 数据库中没有用户
- 密码错误
- JWT_SECRET 不匹配

**解决**:
1. 运行 `initDefaultUser.js` 创建用户
2. 使用正确的登录凭据
3. 确保 `JWT_SECRET` 在前后端一致

### 错误 3: `Failed to fetch` 或 `Connection refused`

**原因**: 
- 后端服务未启动
- 后端 URL 配置错误
- 网络问题

**解决**:
1. 检查后端服务是否运行
2. 测试后端健康检查端点: `https://your-backend.com/health`
3. 检查防火墙和网络配置

### 错误 4: `Token verification failed`

**原因**: 
- JWT_SECRET 未配置或错误
- Token 格式错误

**解决**:
1. 确保后端 `JWT_SECRET` 已配置
2. 清除浏览器 localStorage 中的 token
3. 重新登录

## 🔧 调试步骤

### 1. 检查前端配置

打开浏览器控制台，运行：
```javascript
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Token:', localStorage.getItem('token'));
```

### 2. 检查后端响应

使用 curl 或 Postman 测试登录接口：

```bash
curl -X POST https://your-backend.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123456"}'
```

### 3. 检查网络请求

在浏览器开发者工具的 Network 标签中：
- 查看登录请求的状态码
- 查看请求 URL 是否正确
- 查看响应内容

### 4. 检查后端日志

查看后端服务器日志，寻找：
- 数据库连接信息
- CORS 错误
- JWT 验证错误
- 请求处理日志

## 📝 快速检查清单

部署前确认：

- [ ] 前端 `REACT_APP_API_URL` 已配置
- [ ] 后端 `JWT_SECRET` 已配置（强密码）
- [ ] 后端 `MONGODB_URI` 已配置
- [ ] 后端 `FRONTEND_URL` 已配置（包含前端域名）
- [ ] 数据库连接成功
- [ ] 已创建默认用户（运行 `initDefaultUser.js`）
- [ ] CORS 配置正确
- [ ] 后端服务运行正常（`/health` 端点可访问）

## 🚀 部署后验证

1. **健康检查**
   ```bash
   curl https://your-backend.com/health
   ```

2. **测试登录**
   - 使用默认账户登录
   - 检查浏览器控制台无错误
   - 检查 localStorage 中有 token

3. **测试 API 调用**
   - 登录后访问需要认证的页面
   - 检查 API 请求是否携带 token
   - 检查响应是否正常

## ⚠️ 安全提醒

1. **生产环境必须修改**:
   - 默认管理员密码
   - JWT_SECRET（使用强随机字符串）
   - 删除或禁用默认用户（创建新用户后）

2. **环境变量安全**:
   - 不要在代码中硬编码敏感信息
   - 使用环境变量管理
   - 定期轮换密钥

3. **HTTPS 必需**:
   - 生产环境必须使用 HTTPS
   - Token 传输加密

---

**如仍有问题，请检查**:
1. 浏览器控制台完整错误信息
2. 后端服务器日志
3. 网络请求详情（URL、状态码、响应）

