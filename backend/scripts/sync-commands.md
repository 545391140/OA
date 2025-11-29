# 同步脚本后台执行指南

## 快速开始

### 方法1: 使用后台执行脚本（推荐）

```bash
# 1. 进入脚本目录
cd /path/to/OA/backend/scripts

# 2. 给脚本添加执行权限
chmod +x run-sync-background.sh

# 3. 执行后台同步（全量同步）
./run-sync-background.sh --full

# 或增量同步
./run-sync-background.sh --incremental

# 或指定国家
./run-sync-background.sh --country-id 1

# 或指定开始日期
./run-sync-background.sh --start-date 2025-01-01
```

### 方法2: 使用 nohup（简单直接）

```bash
# 进入后端目录
cd /path/to/OA/backend

# 全量同步
nohup node scripts/syncGlobalLocations.js --full > logs/sync-$(date +%Y%m%d-%H%M%S).log 2>&1 &

# 增量同步
nohup node scripts/syncGlobalLocations.js --incremental > logs/sync-$(date +%Y%m%d-%H%M%S).log 2>&1 &

# 记录PID（用于后续管理）
echo $! > .sync.pid
```

### 方法3: 使用 screen（推荐用于长时间运行）

```bash
# 1. 安装screen（如果没有）
# Ubuntu/Debian: sudo apt-get install screen
# CentOS/RHEL: sudo yum install screen

# 2. 创建screen会话
screen -S sync-script

# 3. 在screen中执行同步
cd /path/to/OA/backend
node scripts/syncGlobalLocations.js --full

# 4. 按 Ctrl+A 然后按 D 来detach（分离会话，不关闭）

# 5. 重新连接会话
screen -r sync-script

# 6. 查看所有screen会话
screen -ls
```

### 方法4: 使用 tmux（类似screen）

```bash
# 1. 安装tmux（如果没有）
# Ubuntu/Debian: sudo apt-get install tmux
# CentOS/RHEL: sudo yum install tmux

# 2. 创建tmux会话
tmux new -s sync-script

# 3. 在tmux中执行同步
cd /path/to/OA/backend
node scripts/syncGlobalLocations.js --full

# 4. 按 Ctrl+B 然后按 D 来detach

# 5. 重新连接会话
tmux attach -t sync-script

# 6. 查看所有tmux会话
tmux ls
```

## 管理后台任务

### 查看运行状态

```bash
# 如果使用了后台执行脚本
ps -p $(cat /path/to/OA/backend/.sync.pid)

# 或查看所有node进程
ps aux | grep syncGlobalLocations

# 查看日志（实时）
tail -f /path/to/OA/backend/logs/sync-*.log

# 查看最近的日志
tail -100 /path/to/OA/backend/logs/sync-*.log
```

### 停止任务

```bash
# 如果使用了后台执行脚本
kill $(cat /path/to/OA/backend/.sync.pid) && rm /path/to/OA/backend/.sync.pid

# 或查找并停止
pkill -f syncGlobalLocations

# 或使用PID停止
kill <PID>
```

### 查看同步进度

```bash
# 实时查看日志
tail -f /path/to/OA/backend/logs/sync-*.log

# 查看统计信息（在日志中搜索）
grep -E "创建|跳过|成功|失败" /path/to/OA/backend/logs/sync-*.log | tail -20
```

## 通过SSH连接服务器执行

### 方式1: SSH执行单条命令

```bash
# 连接到服务器并执行后台同步
ssh user@server "cd /path/to/OA/backend && nohup node scripts/syncGlobalLocations.js --full > logs/sync-\$(date +%Y%m%d-%H%M%S).log 2>&1 &"

# 查看日志
ssh user@server "tail -f /path/to/OA/backend/logs/sync-*.log"
```

### 方式2: SSH进入服务器后执行

```bash
# 1. 连接服务器
ssh user@server

# 2. 进入项目目录
cd /path/to/OA/backend

# 3. 使用后台执行脚本
./scripts/run-sync-background.sh --full

# 4. 退出SSH（任务继续运行）
exit
```

### 方式3: 使用SSH + screen

```bash
# 1. SSH连接并创建screen会话
ssh user@server -t "screen -S sync-script"

# 2. 在screen中执行
cd /path/to/OA/backend
node scripts/syncGlobalLocations.js --full

# 3. Detach screen (Ctrl+A, D)

# 4. 断开SSH，任务继续运行

# 5. 重新连接查看进度
ssh user@server -t "screen -r sync-script"
```

## 定时任务（Cron）

如果需要定期执行同步，可以设置cron任务：

```bash
# 编辑crontab
crontab -e

# 添加以下行（每天凌晨2点执行增量同步）
0 2 * * * cd /path/to/OA/backend && /usr/bin/node scripts/syncGlobalLocations.js --incremental >> logs/sync-cron.log 2>&1

# 或每周日凌晨3点执行全量同步
0 3 * * 0 cd /path/to/OA/backend && /usr/bin/node scripts/syncGlobalLocations.js --full >> logs/sync-cron.log 2>&1
```

## 注意事项

1. **确保环境变量已配置**: 检查 `.env` 文件是否存在并包含必要的配置
2. **确保数据库连接正常**: 同步脚本需要连接MongoDB
3. **磁盘空间**: 确保有足够的磁盘空间存储日志文件
4. **网络连接**: 确保服务器可以访问携程API
5. **进程管理**: 使用PID文件或进程管理器来跟踪任务状态

## 故障排查

### 任务意外停止

```bash
# 查看日志中的错误信息
tail -100 /path/to/OA/backend/logs/sync-*.log | grep -i error

# 检查进程是否还在运行
ps aux | grep syncGlobalLocations

# 检查数据库连接
# 检查网络连接
# 检查磁盘空间
df -h
```

### 日志文件过大

```bash
# 压缩旧日志
gzip /path/to/OA/backend/logs/sync-*.log

# 或删除7天前的日志
find /path/to/OA/backend/logs -name "sync-*.log" -mtime +7 -delete
```

