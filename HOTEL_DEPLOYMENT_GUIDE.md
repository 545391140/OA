# 酒店预订功能部署指南

## 1. SDK 部署说明

### 1.1 SDK 是否需要单独部署？

**答案：不需要单独部署 SDK**

**原因**：
- ✅ Amadeus Node.js SDK (`amadeus`) 是一个 **npm 包**，已经添加到 `package.json` 依赖中
- ✅ 部署时通过 `npm install` 或 `npm ci` 自动安装
- ✅ SDK 会作为项目依赖的一部分被打包到部署环境中
- ✅ 无需单独下载、配置或部署 SDK

### 1.2 SDK 在部署流程中的位置

```
部署流程：
1. 克隆代码仓库
2. 进入 backend 目录
3. 运行 npm install（或 npm ci）← SDK 在这里自动安装
4. 配置环境变量
5. 启动服务
```

---

## 2. 部署前检查清单

### 2.1 依赖检查

**确认 `package.json` 包含 SDK**：
```json
{
  "dependencies": {
    "amadeus": "^11.0.0",  // ✅ 已包含
    // ... 其他依赖
  }
}
```

**检查方法**：
```bash
cd backend
cat package.json | grep amadeus
# 应该看到: "amadeus": "^11.0.0"
```

### 2.2 环境变量配置

**必须配置的环境变量**：

```bash
# Amadeus API 配置（酒店业务使用）
AMADEUS_API_KEY=your_hotel_api_key_here
AMADEUS_API_SECRET=your_hotel_api_secret_here
AMADEUS_API_ENV=production  # 或 test（测试环境）

# 或者使用酒店专用配置（推荐）
AMADEUS_HOTEL_API_KEY=your_hotel_api_key_here
AMADEUS_HOTEL_API_SECRET=your_hotel_api_secret_here
```

**环境变量优先级**（代码中的逻辑）：
1. `AMADEUS_HOTEL_API_KEY` / `AMADEUS_HOTEL_API_SECRET`（优先）
2. `AMADEUS_API_KEY` / `AMADEUS_API_SECRET`（备用）

---

## 3. 不同部署方式的说明

### 3.1 Docker 部署

**Dockerfile 示例**（已包含在项目中）：
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件并安装依赖（SDK 在这里自动安装）
COPY package*.json ./
RUN npm ci --only=production  # ← SDK 自动安装

# 复制源代码
COPY . .

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"]
```

**部署步骤**：
```bash
# 1. 构建镜像（SDK 会自动安装）
docker build -t travel-expense-backend .

# 2. 运行容器（配置环境变量）
docker run -d \
  -p 3001:3001 \
  -e AMADEUS_HOTEL_API_KEY=your_key \
  -e AMADEUS_HOTEL_API_SECRET=your_secret \
  -e AMADEUS_API_ENV=production \
  travel-expense-backend
```

**docker-compose.yml 配置**：
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - AMADEUS_HOTEL_API_KEY=${AMADEUS_HOTEL_API_KEY}
      - AMADEUS_HOTEL_API_SECRET=${AMADEUS_HOTEL_API_SECRET}
      - AMADEUS_API_ENV=production
```

---

### 3.2 传统服务器部署

**部署步骤**：
```bash
# 1. 克隆代码
git clone <repository-url>
cd OA/backend

# 2. 安装依赖（SDK 自动安装）
npm install --production

# 3. 配置环境变量（.env 文件或系统环境变量）
export AMADEUS_HOTEL_API_KEY=your_key
export AMADEUS_HOTEL_API_SECRET=your_secret
export AMADEUS_API_ENV=production

# 4. 启动服务
npm start
```

**使用 PM2 部署**：
```bash
# 1. 安装依赖
npm install --production

# 2. 配置环境变量（在 .env 文件中）
cat > .env << EOF
AMADEUS_HOTEL_API_KEY=your_key
AMADEUS_HOTEL_API_SECRET=your_secret
AMADEUS_API_ENV=production
EOF

# 3. 使用 PM2 启动
pm2 start server.js --name travel-expense-backend
```

---

### 3.3 云平台部署（Railway / Render / Heroku）

**Railway 部署**：

1. **连接 GitHub 仓库**
2. **设置 Root Directory**：`backend`
3. **配置环境变量**：
   ```
   AMADEUS_HOTEL_API_KEY=your_key
   AMADEUS_HOTEL_API_SECRET=your_secret
   AMADEUS_API_ENV=production
   ```
4. **Railway 会自动**：
   - 检测 `package.json`
   - 运行 `npm install`（SDK 自动安装）
   - 启动服务

**Render 部署**：

1. **创建 Web Service**
2. **连接 GitHub 仓库**
3. **设置 Build Command**：`cd backend && npm install`
4. **设置 Start Command**：`cd backend && npm start`
5. **配置环境变量**（在 Render Dashboard）

**Heroku 部署**：

```bash
# 1. 登录 Heroku
heroku login

# 2. 创建应用
heroku create your-app-name

# 3. 配置环境变量
heroku config:set AMADEUS_HOTEL_API_KEY=your_key
heroku config:set AMADEUS_HOTEL_API_SECRET=your_secret
heroku config:set AMADEUS_API_ENV=production

# 4. 部署（SDK 自动安装）
git push heroku main
```

---

## 4. 部署验证

### 4.1 验证 SDK 安装

**方法 1：检查 node_modules**：
```bash
cd backend
ls node_modules | grep amadeus
# 应该看到: amadeus
```

**方法 2：检查 package-lock.json**：
```bash
grep -A 5 '"amadeus"' package-lock.json
# 应该看到 SDK 的版本信息
```

**方法 3：运行时检查**：
```bash
# 在服务器上运行
node -e "console.log(require('amadeus/package.json').version)"
# 应该输出: 11.0.0
```

### 4.2 验证 API 连接

**运行测试脚本**：
```bash
cd backend
AMADEUS_HOTEL_API_KEY=your_key \
AMADEUS_HOTEL_API_SECRET=your_secret \
AMADEUS_API_ENV=production \
node scripts/testHotelSdk.js
```

**预期结果**：
- ✅ SDK 初始化成功
- ✅ 所有测试通过
- ✅ 无错误信息

---

## 5. 常见问题

### 5.1 SDK 安装失败

**问题**：`npm install` 时 SDK 安装失败

**解决方案**：
```bash
# 1. 清除缓存
npm cache clean --force

# 2. 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 3. 重新安装
npm install

# 4. 如果仍然失败，检查网络连接
npm install amadeus --verbose
```

### 5.2 环境变量未生效

**问题**：SDK 无法获取 API Key

**检查方法**：
```bash
# 检查环境变量
echo $AMADEUS_HOTEL_API_KEY
echo $AMADEUS_API_KEY

# 在代码中打印（临时调试）
console.log('API Key:', process.env.AMADEUS_HOTEL_API_KEY || process.env.AMADEUS_API_KEY);
```

**解决方案**：
- 确保环境变量名称正确
- 确保环境变量在服务启动前设置
- 检查 `.env` 文件是否被正确加载（如果使用 dotenv）

### 5.3 生产环境 API Key 配置

**问题**：测试环境正常，生产环境失败

**检查清单**：
- ✅ 使用生产环境的 API Key 和 Secret
- ✅ 设置 `AMADEUS_API_ENV=production`
- ✅ 确认生产环境 API Key 有酒店 API 权限
- ✅ 检查 API Key 是否过期或被禁用

---

## 6. 部署最佳实践

### 6.1 环境变量管理

**推荐方式**：
- ✅ 使用环境变量，不要硬编码
- ✅ 使用 `.env` 文件（开发环境）
- ✅ 使用云平台的环境变量配置（生产环境）
- ✅ 使用密钥管理服务（如 AWS Secrets Manager）

**不推荐**：
- ❌ 在代码中硬编码 API Key
- ❌ 将 `.env` 文件提交到 Git
- ❌ 在日志中输出 API Key

### 6.2 依赖管理

**推荐方式**：
- ✅ 使用 `package-lock.json` 锁定版本
- ✅ 使用 `npm ci` 而不是 `npm install`（CI/CD）
- ✅ 定期更新依赖（`npm audit`）

**package.json 示例**：
```json
{
  "dependencies": {
    "amadeus": "^11.0.0"  // 使用 ^ 允许补丁和次版本更新
  }
}
```

### 6.3 监控和日志

**推荐监控指标**：
- SDK 初始化是否成功
- API 调用成功率
- API 调用响应时间
- Token 刷新频率

**日志示例**：
```javascript
// 在服务启动时记录
logger.info('Amadeus SDK initialized', {
  version: require('amadeus/package.json').version,
  environment: process.env.AMADEUS_API_ENV,
  hasApiKey: !!process.env.AMADEUS_HOTEL_API_KEY,
});
```

---

## 7. 部署检查清单

### 部署前检查

- [ ] `package.json` 包含 `amadeus` 依赖
- [ ] `package-lock.json` 已更新
- [ ] 环境变量已配置（API Key 和 Secret）
- [ ] 环境变量名称正确（`AMADEUS_HOTEL_API_KEY` 或 `AMADEUS_API_KEY`）
- [ ] `AMADEUS_API_ENV` 设置为 `production`（生产环境）
- [ ] 测试环境验证通过

### 部署后验证

- [ ] 服务正常启动
- [ ] SDK 初始化成功（检查日志）
- [ ] 可以调用酒店搜索 API
- [ ] 可以调用酒店报价 API
- [ ] 错误处理正常

---

## 8. 总结

### 关键点

1. **SDK 不需要单独部署**
   - SDK 是 npm 包，通过 `npm install` 自动安装
   - 已包含在 `package.json` 依赖中

2. **部署时只需确保**：
   - ✅ `package.json` 包含 `amadeus` 依赖
   - ✅ 运行 `npm install` 或 `npm ci`
   - ✅ 配置正确的环境变量

3. **环境变量配置**：
   - 开发环境：`.env` 文件
   - 生产环境：云平台环境变量配置

4. **验证部署**：
   - 检查 `node_modules/amadeus` 存在
   - 运行测试脚本验证连接
   - 检查服务日志

---

**文档版本**: 1.0  
**创建日期**: 2025-12-21  
**适用版本**: Amadeus SDK v11.0.0

