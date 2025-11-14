# 可用的云端数据库服务

## 🆓 免费 MongoDB 云数据库

### 1. **MongoDB Atlas** (推荐)
- **网址**: https://www.mongodb.com/cloud/atlas
- **免费额度**: 
  - 512MB 存储空间
  - 共享集群（M0）
  - 永久免费
- **优点**:
  - 官方服务，稳定可靠
  - 支持 MongoDB 完整功能
  - 简单易用，快速设置
  - 有中文支持
- **适合**: 开发测试、小型项目

### 2. **Render**
- **网址**: https://render.com
- **免费额度**: 
  - MongoDB 512MB 存储
  - 90天免费试用
- **优点**: 界面简洁，易于部署

### 3. **Railway**
- **网址**: https://railway.app
- **免费额度**: 
  - $5 免费额度/月
  - MongoDB 插件支持
- **优点**: 现代化界面，易于集成

## 🇨🇳 中国地区可用

### 1. **阿里云 MongoDB**
- **网址**: https://www.aliyun.com/product/mongodb
- **免费额度**: 新用户有免费试用
- **优点**: 
  - 国内访问速度快
  - 有中文支持
  - 稳定可靠

### 2. **腾讯云 MongoDB**
- **网址**: https://cloud.tencent.com/product/cmongodb
- **免费额度**: 新用户有免费试用
- **优点**: 国内服务，访问稳定

## 🔧 快速配置 MongoDB Atlas (推荐)

### 步骤1: 注册账号
1. 访问 https://www.mongodb.com/cloud/atlas/register
2. 使用邮箱注册（支持 Google/GitHub 登录）

### 步骤2: 创建免费集群
1. 点击 "Build a Database"
2. 选择 "FREE" (M0 Sandbox)
3. 选择云服务商和地区（建议选择离您最近的）
4. 点击 "Create"

### 步骤3: 创建数据库用户
1. 在 "Database Access" 创建用户
2. 设置用户名和密码
3. 权限选择 "Atlas admin"

### 步骤4: 配置网络访问
1. 在 "Network Access" 添加 IP
2. 开发环境可以添加 `0.0.0.0/0` (允许所有IP，仅用于测试)

### 步骤5: 获取连接字符串
1. 点击 "Connect"
2. 选择 "Connect your application"
3. 复制连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/travel-expense-system?retryWrites=true&w=majority
   ```

### 步骤6: 配置项目
在项目的 `.env` 文件中添加：
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/travel-expense-system?retryWrites=true&w=majority
```

或在 `backend/server.js` 启动时设置：
```bash
MONGODB_URI="your-connection-string" npm start
```

## 📝 其他免费数据库选项

### PostgreSQL (如果改用关系型数据库)
- **Supabase**: https://supabase.com (免费500MB)
- **Neon**: https://neon.tech (免费512MB)
- **ElephantSQL**: https://www.elephantsql.com (免费20MB)

### Redis (缓存)
- **Redis Cloud**: https://redis.com/try-free/ (免费30MB)
- **Upstash**: https://upstash.com (免费10K命令/天)

## 🚀 推荐方案

**开发测试阶段**: MongoDB Atlas (免费，稳定，官方支持)
**生产环境**: 
- 国内项目：阿里云/腾讯云 MongoDB
- 国际项目：MongoDB Atlas 付费计划

## ⚠️ 注意事项

1. **免费额度限制**: 注意存储空间和使用量
2. **安全设置**: 生产环境不要使用 `0.0.0.0/0`，设置具体IP白名单
3. **数据备份**: 定期备份重要数据
4. **连接字符串**: 妥善保管，不要提交到代码仓库

## 🔗 相关链接

- MongoDB Atlas 文档: https://docs.atlas.mongodb.com
- MongoDB 官方教程: https://university.mongodb.com
