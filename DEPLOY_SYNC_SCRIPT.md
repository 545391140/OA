# 同步脚本服务器部署指南

## 📋 部署前准备

### 1. 检查服务器环境

确保服务器已安装：
- Node.js (推荐 v16+)
- npm 或 yarn
- MongoDB 连接配置

### 2. 确认文件列表

需要上传的文件：
```
backend/
├── scripts/
│   └── syncGlobalLocations.js      # 主同步脚本
├── services/
│   └── ctripApiService.js         # 携程API服务
├── models/
│   └── Location.js                # Location模型
├── config/
│   └── database.js                 # 数据库配置
└── config.js                       # 配置文件
```

## 🚀 部署步骤

### 方法一：使用 Git 部署（推荐）

如果服务器已配置 Git：

```bash
# 1. SSH连接到服务器
ssh user@your-server.com

# 2. 进入项目目录
cd /path/to/your/project

# 3. 拉取最新代码
git pull origin main

# 4. 安装依赖（如果需要）
npm install

# 5. 运行同步脚本
node backend/scripts/syncGlobalLocations.js
```

### 方法二：使用 SCP 上传文件

```bash
# 1. 在本地打包需要上传的文件
cd /path/to/your/project
tar -czf sync-script.tar.gz \
  backend/scripts/syncGlobalLocations.js \
  backend/services/ctripApiService.js \
  backend/models/Location.js \
  backend/config/database.js \
  backend/config.js \
  package.json

# 2. 上传到服务器
scp sync-script.tar.gz user@your-server.com:/path/to/project/

# 3. SSH连接到服务器
ssh user@your-server.com

# 4. 解压文件
cd /path/to/project
tar -xzf sync-script.tar.gz

# 5. 安装依赖
npm install

# 6. 运行同步脚本
node backend/scripts/syncGlobalLocations.js
```

### 方法三：使用 rsync 同步

```bash
# 同步整个backend目录
rsync -avz --exclude 'node_modules' \
  backend/ user@your-server.com:/path/to/project/backend/

# SSH连接并运行
ssh user@your-server.com "cd /path/to/project && node backend/scripts/syncGlobalLocations.js"
```

## ⚙️ 服务器配置

### 1. 环境变量配置

在服务器上创建或编辑 `.env` 文件：

```bash
# 在服务器上
cd /path/to/project/backend
nano .env
```

添加以下配置：

```env
# MongoDB连接
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# 携程API配置（已在config.js中配置，如需覆盖可设置）
# CTRIP_APP_KEY=your_app_key
# CTRIP_APP_SECURITY=your_app_security

# Node环境
NODE_ENV=production
```

### 2. 验证配置

```bash
# 检查环境变量
node -e "require('dotenv').config(); console.log('MongoDB URI:', process.env.MONGODB_URI ? '已配置' : '未配置');"
```

## 🎯 执行同步

### 全量同步（首次运行）

```bash
# 在服务器上执行
cd /path/to/project
node backend/scripts/syncGlobalLocations.js
```

### 增量同步（日常更新）

```bash
# 增量同步
node backend/scripts/syncGlobalLocations.js --incremental
```

### 指定国家同步

```bash
# 只同步中国
node backend/scripts/syncGlobalLocations.js --country-id 1
```

## 📊 监控执行

### 使用 nohup 后台运行

```bash
# 后台运行并保存日志
nohup node backend/scripts/syncGlobalLocations.js > sync.log 2>&1 &

# 查看进程
ps aux | grep syncGlobalLocations

# 查看日志
tail -f sync.log
```

### 使用 screen 会话

```bash
# 创建screen会话
screen -S sync

# 运行脚本
node backend/scripts/syncGlobalLocations.js

# 按 Ctrl+A 然后 D 分离会话

# 重新连接会话
screen -r sync
```

### 使用 tmux 会话

```bash
# 创建tmux会话
tmux new -s sync

# 运行脚本
node backend/scripts/syncGlobalLocations.js

# 按 Ctrl+B 然后 D 分离会话

# 重新连接会话
tmux attach -t sync
```

## ⏰ 定时任务设置

### 使用 crontab

```bash
# 编辑crontab
crontab -e

# 添加定时任务（每天凌晨2点执行增量同步）
0 2 * * * cd /path/to/project && /usr/bin/node backend/scripts/syncGlobalLocations.js --incremental >> /path/to/project/sync.log 2>&1

# 每周日凌晨3点执行全量同步
0 3 * * 0 cd /path/to/project && /usr/bin/node backend/scripts/syncGlobalLocations.js >> /path/to/project/sync-full.log 2>&1
```

### 使用 systemd 服务（推荐）

创建服务文件 `/etc/systemd/system/location-sync.service`：

```ini
[Unit]
Description=Location Data Sync Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/project
Environment=NODE_ENV=production
ExecStart=/usr/bin/node backend/scripts/syncGlobalLocations.js --incremental
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

创建定时器文件 `/etc/systemd/system/location-sync.timer`：

```ini
[Unit]
Description=Location Data Sync Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

启用服务：

```bash
sudo systemctl enable location-sync.timer
sudo systemctl start location-sync.timer
sudo systemctl status location-sync.timer
```

## 🔍 故障排查

### 检查脚本权限

```bash
# 确保脚本有执行权限
chmod +x backend/scripts/syncGlobalLocations.js
```

### 检查Node.js版本

```bash
node --version
# 应该 >= 16.0.0
```

### 检查依赖

```bash
# 安装依赖
npm install

# 检查关键依赖
npm list mongoose dotenv axios
```

### 检查数据库连接

```bash
# 测试数据库连接
node -e "
require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const config = require('./backend/config');
mongoose.connect(config.MONGODB_URI)
  .then(() => { console.log('✓ 数据库连接成功'); process.exit(0); })
  .catch(err => { console.error('✗ 数据库连接失败:', err.message); process.exit(1); });
"
```

### 检查API配置

```bash
# 测试API连接
node backend/scripts/testCtripApi.js
```

## 📝 日志管理

### 日志文件位置

- 同步状态：`backend/.sync_status.json`
- 执行日志：`sync.log`（如果使用nohup）
- 系统日志：`journalctl -u location-sync`（如果使用systemd）

### 查看日志

```bash
# 查看同步状态
cat backend/.sync_status.json

# 查看执行日志
tail -f sync.log

# 查看系统日志
journalctl -u location-sync -f
```

## 🔐 安全建议

1. **保护API密钥**：确保 `.env` 文件权限正确
   ```bash
   chmod 600 backend/.env
   ```

2. **保护同步状态文件**：添加到 `.gitignore`
   ```bash
   echo "backend/.sync_status.json" >> .gitignore
   ```

3. **使用非root用户**：避免使用root用户运行脚本

4. **限制网络访问**：确保服务器可以访问携程API

## 📊 性能优化

### 批量处理

脚本已实现批量处理，每100条数据输出一次进度。

### 内存管理

如果数据量很大，可以考虑：
- 分批处理国家
- 增加服务器内存
- 使用流式处理

### 网络优化

- 使用生产环境API（已配置）
- 合理设置超时时间（已设置为30秒）
- 每个国家之间延迟1秒（已实现）

## ✅ 验证部署

部署完成后，运行以下命令验证：

```bash
# 1. 测试API连接
node backend/scripts/testCtripApi.js

# 2. 测试数据库连接
node -e "require('./backend/config/database').default().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })"

# 3. 运行小规模测试（只同步一个国家）
node backend/scripts/syncGlobalLocations.js --country-id 1

# 4. 检查同步状态
cat backend/.sync_status.json
```

## 🆘 常见问题

### 问题1：找不到模块

**解决：**
```bash
npm install
```

### 问题2：数据库连接失败

**解决：**
- 检查 `.env` 文件中的 `MONGODB_URI`
- 检查网络连接
- 检查MongoDB Atlas白名单设置

### 问题3：API返回"非对接客户"

**解决：**
- 确认使用生产环境
- 检查API密钥配置
- 联系携程确认API权限

### 问题4：内存不足

**解决：**
- 增加服务器内存
- 分批处理国家
- 使用 `--country-id` 参数逐个同步

## 📞 支持

如有问题，请检查：
1. 日志文件
2. 同步状态文件
3. 服务器资源使用情况

