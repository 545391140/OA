# 服务器环境变量配置指南

## 📋 概述

同步脚本需要配置携程API密钥才能正常工作。本指南说明如何在服务器上配置环境变量。

## 🔑 必需的配置

### 携程API配置

- `CTRIP_APP_KEY` - 携程应用密钥
- `CTRIP_APP_SECURITY` - 携程应用安全码

### 数据库配置

- `MONGODB_URI` - MongoDB连接字符串

## 🚀 快速配置

### 方法一：使用配置脚本（推荐）

```bash
# 1. 确保本地有 .env 文件（包含携程API密钥）
# 如果没有，脚本会从 config.js 读取默认值

# 2. 运行配置脚本
./setup-server-env.sh user@server.com /path/to/project
```

脚本会自动：
- 上传本地 `.env` 文件（如果存在）
- 或从 `config.js` 读取配置并创建 `.env` 文件
- 设置正确的文件权限（600）

### 方法二：手动配置

```bash
# 1. SSH连接到服务器
ssh user@server.com

# 2. 进入项目目录
cd /path/to/project/backend

# 3. 创建或编辑 .env 文件
nano .env
```

添加以下内容：

```env
# 携程商旅API配置
CTRIP_APP_KEY=obk_rjwl
CTRIP_APP_SECURITY=eW5(Np%RrUuU#(Z3x$8@kOW(

# MongoDB连接配置
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Node环境
NODE_ENV=production
```

保存并设置权限：

```bash
# 4. 设置文件权限（保护敏感信息）
chmod 600 .env
```

## 📝 配置说明

### 携程API配置

当前配置值（已在 `config.js` 中设置默认值）：
- `CTRIP_APP_KEY`: `obk_rjwl`
- `CTRIP_APP_SECURITY`: `eW5(Np%RrUuU#(Z3x$8@kOW(`

**注意：** 如果这些值需要更新，请：
1. 更新 `backend/config.js` 中的默认值
2. 或在服务器上的 `.env` 文件中设置新值

### MongoDB配置

根据实际情况配置MongoDB连接字符串：

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### 环境变量优先级

配置读取优先级（从高到低）：
1. 环境变量（`process.env.CTRIP_APP_KEY`）
2. `.env` 文件中的值
3. `config.js` 中的默认值

## ✅ 验证配置

### 1. 检查环境变量文件

```bash
# 在服务器上
cd /path/to/project/backend
cat .env
```

### 2. 测试API连接

```bash
# 在服务器上
node backend/scripts/testCtripApi.js
```

应该看到：
```
✅ Ticket获取成功
✅ 国家列表获取成功
✅ POI数据获取成功
```

### 3. 测试数据库连接

```bash
# 在服务器上
node -e "
require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const config = require('./backend/config');
mongoose.connect(config.MONGODB_URI)
  .then(() => { console.log('✓ 数据库连接成功'); process.exit(0); })
  .catch(err => { console.error('✗ 数据库连接失败:', err.message); process.exit(1); });
"
```

## 🔐 安全建议

1. **文件权限**：确保 `.env` 文件权限为 600（仅所有者可读写）
   ```bash
   chmod 600 backend/.env
   ```

2. **不要提交到Git**：确保 `.env` 在 `.gitignore` 中
   ```bash
   echo "backend/.env" >> .gitignore
   ```

3. **使用环境变量**：生产环境建议使用系统环境变量而不是文件

4. **定期更新密钥**：如果API密钥泄露，及时更新

## 🔄 更新配置

### 更新携程API密钥

```bash
# 方法1：编辑 .env 文件
ssh user@server.com
cd /path/to/project/backend
nano .env
# 修改 CTRIP_APP_KEY 和 CTRIP_APP_SECURITY

# 方法2：使用环境变量（临时）
export CTRIP_APP_KEY=new_key
export CTRIP_APP_SECURITY=new_security
node backend/scripts/syncGlobalLocations.js
```

### 更新MongoDB连接

```bash
ssh user@server.com
cd /path/to/project/backend
nano .env
# 修改 MONGODB_URI
```

## 📊 配置检查清单

部署前检查：

- [ ] `.env` 文件已创建
- [ ] `CTRIP_APP_KEY` 已配置
- [ ] `CTRIP_APP_SECURITY` 已配置
- [ ] `MONGODB_URI` 已配置（如果需要）
- [ ] 文件权限设置为 600
- [ ] API连接测试通过
- [ ] 数据库连接测试通过（如果需要）

## 🆘 故障排查

### 问题：API返回"非对接客户"

**原因：** API密钥未配置或配置错误

**解决：**
1. 检查 `.env` 文件中的配置
2. 检查 `config.js` 中的默认值
3. 运行 `node backend/scripts/testCtripApi.js` 测试

### 问题：找不到 .env 文件

**解决：**
```bash
# 使用配置脚本
./setup-server-env.sh user@server.com /path/to/project

# 或手动创建
ssh user@server.com
cd /path/to/project/backend
cp .env.example .env
nano .env  # 编辑配置
```

### 问题：环境变量未生效

**解决：**
1. 确保 `.env` 文件在正确的位置（`backend/.env`）
2. 检查文件权限
3. 重启Node.js进程
4. 检查 `dotenv` 是否正确加载

## 📚 相关文档

- `DEPLOY_SYNC_SCRIPT.md` - 完整部署指南
- `QUICK_DEPLOY.md` - 快速部署参考
- `CTRIP_API_CONFIG_GUIDE.md` - API配置说明

