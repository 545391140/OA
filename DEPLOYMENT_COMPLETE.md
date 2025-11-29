# 完整部署流程

## 🎯 部署步骤总结

### 第一步：部署脚本文件

```bash
# 使用自动化部署脚本
./deploy-sync.sh user@server.com /path/to/project
```

### 第二步：配置环境变量（重要！）

```bash
# 使用环境变量配置脚本（推荐）
./setup-server-env.sh user@server.com /path/to/project
```

或手动配置：

```bash
# SSH连接服务器
ssh user@server.com

# 进入项目目录
cd /path/to/project/backend

# 创建.env文件（从模板复制）
cp env.template .env

# 编辑配置
nano .env

# 设置权限
chmod 600 .env
```

### 第三步：验证配置

```bash
# 测试API连接
ssh user@server.com 'cd /path/to/project && node backend/scripts/testCtripApi.js'

# 测试数据库连接（如果需要）
ssh user@server.com 'cd /path/to/project && node -e "require(\"dotenv\").config({ path: \"./backend/.env\" }); const mongoose = require(\"mongoose\"); const config = require(\"./backend/config\"); mongoose.connect(config.MONGODB_URI).then(() => { console.log(\"✓ 数据库连接成功\"); process.exit(0); }).catch(err => { console.error(\"✗ 数据库连接失败:\", err.message); process.exit(1); });"'
```

### 第四步：运行同步

```bash
# 全量同步（首次）
ssh user@server.com 'cd /path/to/project && node backend/scripts/syncGlobalLocations.js'

# 增量同步（日常）
ssh user@server.com 'cd /path/to/project && node backend/scripts/syncGlobalLocations.js --incremental'

# 后台运行
ssh user@server.com 'cd /path/to/project && nohup node backend/scripts/syncGlobalLocations.js > sync.log 2>&1 &'
```

## 📋 必需的环境变量

### 携程API配置（必需）

```env
CTRIP_APP_KEY=obk_rjwl
CTRIP_APP_SECURITY=eW5(Np%RrUuU#(Z3x$8@kOW(
```

**当前值已在 `backend/config.js` 中配置，如果使用默认值，可以不设置环境变量。**

### MongoDB配置（如果需要）

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

## 🔍 验证清单

部署完成后，检查以下项目：

- [ ] 脚本文件已上传
- [ ] 依赖已安装（`npm install`）
- [ ] `.env` 文件已创建
- [ ] 携程API密钥已配置
- [ ] MongoDB连接已配置（如果需要）
- [ ] 文件权限正确（`.env` 为 600）
- [ ] API连接测试通过
- [ ] 数据库连接测试通过（如果需要）

## 📚 相关文档

- `DEPLOY_SYNC_SCRIPT.md` - 详细部署指南
- `ENV_CONFIG_GUIDE.md` - 环境变量配置指南
- `QUICK_DEPLOY.md` - 快速部署参考
- `INCREMENTAL_SYNC_GUIDE.md` - 增量同步使用指南

## 🆘 常见问题

### 问题：API返回"非对接客户"

**解决：** 确保环境变量已正确配置
```bash
./setup-server-env.sh user@server.com /path/to/project
```

### 问题：找不到模块

**解决：** 安装依赖
```bash
ssh user@server.com 'cd /path/to/project && npm install'
```

### 问题：环境变量未生效

**解决：** 检查文件位置和权限
```bash
ssh user@server.com 'cd /path/to/project/backend && ls -la .env && cat .env'
```

