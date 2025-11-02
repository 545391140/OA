# AWS 服务器一键部署指南

## 📋 快速开始

### 1. 配置部署信息

复制配置文件并修改：

```bash
cp deploy.config.example deploy.config
```

编辑 `deploy.config` 文件，填入你的服务器信息：

```bash
SERVER_HOST="your-server-ip-or-domain"  # 你的服务器地址
SERVER_USER="ubuntu"                     # SSH 用户名
SERVER_PORT="3000"                        # 服务端口
DEPLOY_PATH="/var/www/oa"                 # 部署路径

# 根据你的服务管理方式选择重启命令
RESTART_COMMAND="pm2 restart oa-backend"
```

### 2. 配置 SSH 免密登录

为了部署过程更顺畅，建议配置 SSH 密钥：

```bash
# 生成 SSH 密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub $SERVER_USER@$SERVER_HOST

# 或使用密钥文件
ssh-copy-id -i ~/.ssh/your-key.pem $SERVER_USER@$SERVER_HOST
```

### 3. 执行部署

```bash
# 给脚本添加执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

## 🛠️ 服务重启命令配置

根据你的服务器环境选择对应的重启命令：

### 使用 PM2（推荐）

```bash
RESTART_COMMAND="pm2 restart oa-backend || pm2 start backend/server.js --name oa-backend"
```

**首次部署时需要：**
```bash
# 在服务器上安装 PM2
npm install -g pm2

# 创建 PM2 启动脚本
cd /var/www/oa/backend
pm2 start server.js --name oa-backend
pm2 save
pm2 startup  # 设置开机自启
```

### 使用 systemd

```bash
RESTART_COMMAND="sudo systemctl restart oa-backend"
```

**创建 systemd 服务文件 `/etc/systemd/system/oa-backend.service`：**

```ini
[Unit]
Description=OA Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/oa/backend
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="MONGODB_URI=mongodb+srv://..."
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

然后执行：
```bash
sudo systemctl daemon-reload
sudo systemctl enable oa-backend
sudo systemctl start oa-backend
```

### 使用 Docker Compose

```bash
RESTART_COMMAND="cd /var/www/oa && docker-compose restart backend"
```

## 📝 部署流程说明

部署脚本会执行以下步骤：

1. ✅ **检查 Git 状态** - 确保代码已提交
2. ✅ **安装依赖** - 安装前端和后端依赖
3. ✅ **构建前端** - 执行 `npm run build`
4. ✅ **创建部署包** - 打包需要部署的文件
5. ✅ **上传到服务器** - 使用 rsync 同步文件
6. ✅ **执行部署** - 在服务器上安装依赖并重启服务
7. ✅ **健康检查** - 验证服务是否正常运行

## 🔧 服务器环境准备

### 1. 安装 Node.js

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. 创建部署目录

```bash
sudo mkdir -p /var/www/oa
sudo chown -R $USER:$USER /var/www/oa
```

### 3. 配置环境变量

在服务器上创建 `.env` 文件：

```bash
cd /var/www/oa/backend
nano .env
```

添加：
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://liuzhijiansun:BE12mjA8imCd4vBp@cluster0.tzxphum.mongodb.net/travel-expense-system?retryWrites=true&w=majority
JWT_SECRET=your-strong-jwt-secret-here
FRONTEND_URL=http://oa-production-cef9.up.railway.app
```

## 🌐 Nginx 配置（可选）

如果你使用 Nginx 作为反向代理，创建配置文件 `/etc/nginx/sites-available/oa`：

```nginx
server {
    listen 80;
    server_name oa-production-cef9.up.railway.app;

    # 前端静态文件
    location / {
        root /var/www/oa/frontend;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/oa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🚨 常见问题

### 1. SSH 连接失败

```bash
# 检查 SSH 连接
ssh $SERVER_USER@$SERVER_HOST

# 如果使用密钥文件
ssh -i ~/.ssh/your-key.pem $SERVER_USER@$SERVER_HOST
```

### 2. 文件上传权限错误

```bash
# 检查部署目录权限
ssh $SERVER_USER@$SERVER_HOST "ls -la $DEPLOY_PATH"

# 修改权限（如果需要）
ssh $SERVER_USER@$SERVER_HOST "sudo chown -R $SERVER_USER:$SERVER_USER $DEPLOY_PATH"
```

### 3. 服务重启失败

```bash
# 检查服务状态
ssh $SERVER_USER@$SERVER_HOST "$RESTART_COMMAND"

# 查看日志
ssh $SERVER_USER@$SERVER_HOST "tail -f /var/www/oa/backend/server.log"
```

### 4. 健康检查失败

```bash
# 手动检查
curl http://$SERVER_HOST:$SERVER_PORT/health

# 检查服务是否运行
ssh $SERVER_USER@$SERVER_HOST "ps aux | grep node"
```

## 📊 部署后验证

1. **检查服务状态**
   ```bash
   curl http://oa-production-cef9.up.railway.app:3000/health
   ```

2. **测试 API**
   ```bash
   curl http://oa-production-cef9.up.railway.app:3000/api/auth/login
   ```

3. **访问前端**
   浏览器访问：`http://oa-production-cef9.up.railway.app:3000`

## 🔐 安全建议

1. **使用 SSH 密钥**而不是密码登录
2. **限制 SSH 端口**和 IP 访问
3. **定期更新系统**和依赖
4. **配置防火墙规则**
5. **使用 HTTPS**（建议配置 SSL 证书）

## 📚 相关文件

- `deploy.sh` - 部署脚本
- `deploy.config` - 配置文件（需要创建）
- `deploy.config.example` - 配置示例

---

**提示**: 首次部署建议先在测试环境验证，确认无误后再部署到生产环境。

