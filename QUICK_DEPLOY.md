# 快速部署指南

## 🚀 一键部署（推荐）

使用提供的部署脚本：

```bash
# 1. 确保脚本有执行权限
chmod +x deploy-sync.sh

# 2. 运行部署脚本
./deploy-sync.sh user@your-server.com /path/to/project
```

## 📋 手动部署步骤

### 1. 上传文件

```bash
# 使用SCP上传
scp -r backend/scripts/syncGlobalLocations.js \
     backend/services/ctripApiService.js \
     backend/models/Location.js \
     backend/config.js \
     user@server.com:/path/to/project/backend/
```

### 2. SSH连接服务器

```bash
ssh user@your-server.com
cd /path/to/project
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量（如果需要）

```bash
# 编辑.env文件
nano backend/.env
```

### 5. 运行同步脚本

```bash
# 全量同步（首次）
node backend/scripts/syncGlobalLocations.js

# 增量同步（日常）
node backend/scripts/syncGlobalLocations.js --incremental
```

## ⏰ 后台运行

```bash
# 使用nohup后台运行
nohup node backend/scripts/syncGlobalLocations.js > sync.log 2>&1 &

# 查看日志
tail -f sync.log
```

## 🔄 定时任务

```bash
# 编辑crontab
crontab -e

# 添加每天凌晨2点增量同步
0 2 * * * cd /path/to/project && /usr/bin/node backend/scripts/syncGlobalLocations.js --incremental >> sync.log 2>&1
```

## ✅ 验证部署

```bash
# 测试API连接
node backend/scripts/testCtripApi.js

# 测试同步（只同步一个国家）
node backend/scripts/syncGlobalLocations.js --country-id 1
```

## 📚 详细文档

查看 `DEPLOY_SYNC_SCRIPT.md` 获取完整部署指南。

