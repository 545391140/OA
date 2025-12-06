# 🔧 环境变量配置指南

## 📋 概述

本项目使用环境变量管理敏感配置信息，确保代码安全性和多环境部署的灵活性。

---

## 🚀 快速开始

### 开发环境设置

1. **复制环境变量模板**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **编辑 `.env` 文件**
   ```bash
   # 使用你喜欢的编辑器
   nano .env
   # 或
   vim .env
   # 或
   code .env
   ```

3. **填入开发环境配置**
   - 使用本地MongoDB: `mongodb://localhost:27017/travel-expense-dev`
   - 生成JWT密钥: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

---

## 🏭 生产环境设置

### 方法1: 使用 .env 文件

1. **SSH到生产服务器**
   ```bash
   ssh user@your-production-server
   ```

2. **创建 `.env` 文件**
   ```bash
   cd /path/to/backend
   nano .env
   ```

3. **填入生产环境配置**
   - 使用真实的MongoDB连接串
   - 使用强JWT密钥（至少32字符）
   - 填入所有必需的API密钥

4. **设置文件权限**
   ```bash
   chmod 600 .env
   chown app-user:app-user .env
   ```

5. **重启服务**
   ```bash
   pm2 restart all
   # 或
   systemctl restart your-service
   ```

### 方法2: 使用系统环境变量

```bash
# 添加到 ~/.bashrc 或 /etc/environment
export NODE_ENV=production
export MONGODB_URI="mongodb+srv://..."
export JWT_SECRET="your-secret-key"
export CTRIP_APP_KEY="your-app-key"
export CTRIP_APP_SECURITY="your-security-key"

# 重新加载
source ~/.bashrc
```

### 方法3: 使用PM2生态系统文件

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'travel-expense-backend',
    script: './server.js',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      MONGODB_URI: 'mongodb+srv://...',
      JWT_SECRET: 'your-secret-key',
      CTRIP_APP_KEY: 'your-app-key',
      CTRIP_APP_SECURITY: 'your-security-key'
    }
  }]
};
```

启动:
```bash
pm2 start ecosystem.config.js --env production
```

---

## 📝 环境变量说明

### 必需变量 (生产环境)

| 变量名 | 说明 | 示例 | 获取方式 |
|--------|------|------|----------|
| `NODE_ENV` | 运行环境 | `production` / `development` | 手动设置 |
| `MONGODB_URI` | MongoDB连接串 | `mongodb+srv://user:pass@host/db` | MongoDB Atlas控制台 |
| `JWT_SECRET` | JWT签名密钥 | 至少32字符的随机字符串 | `crypto.randomBytes(32).toString('hex')` |
| `CTRIP_APP_KEY` | 携程API Key | `your_app_key` | 携程商旅平台 |
| `CTRIP_APP_SECURITY` | 携程Security Key | `your_security_key` | 携程商旅平台 |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3001` |
| `EMAIL_HOST` | 邮件服务器 | `smtp.gmail.com` |
| `EMAIL_PORT` | 邮件端口 | `587` |
| `EMAIL_USER` | 邮件用户名 | - |
| `EMAIL_PASS` | 邮件密码/应用密码 | - |
| `MISTRAL_API_KEY` | Mistral AI密钥 | - |
| `DASHSCOPE_API_KEY` | 阿里云百炼密钥 | - |
| `MAX_FILE_SIZE` | 最大文件大小 | `10485760` (10MB) |

---

## 🔑 密钥生成指南

### JWT密钥
```bash
# 生成随机32字节密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### MongoDB密码
```bash
# 生成强密码
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

---

## 🔒 安全最佳实践

### ✅ 应该做的

1. **使用强密钥**
   - JWT密钥至少32字符
   - 使用随机生成的密钥
   - 定期轮换密钥（每3-6个月）

2. **保护 .env 文件**
   ```bash
   # 设置只有所有者可读写
   chmod 600 .env
   
   # 确保在 .gitignore 中
   echo ".env" >> .gitignore
   ```

3. **限制访问权限**
   - 只有必要的人员才能访问生产环境密钥
   - 使用密钥管理工具（如AWS Secrets Manager）
   - 记录密钥访问日志

4. **使用不同的密钥**
   - 开发、测试、生产环境使用不同的密钥
   - 每个服务使用独立的数据库账号

### ❌ 不应该做的

1. **永远不要**
   - ❌ 提交 `.env` 文件到Git
   - ❌ 在代码中硬编码密钥
   - ❌ 在日志中打印敏感信息
   - ❌ 通过邮件或聊天工具传输密钥
   - ❌ 使用弱密码或简单密钥

2. **避免**
   - ⚠️ 在多个服务共享同一密钥
   - ⚠️ 长时间不更换密钥
   - ⚠️ 将密钥存储在代码仓库中

---

## 🧪 验证配置

### 测试开发环境
```bash
cd backend
NODE_ENV=development npm start
```
应该能成功连接到本地MongoDB。

### 测试生产环境
```bash
# 不设置环境变量应报错
NODE_ENV=production npm start
# ❌ 应该抛出: "MONGODB_URI environment variable is required"

# 设置环境变量应成功
NODE_ENV=production \
MONGODB_URI="mongodb://..." \
JWT_SECRET="..." \
CTRIP_APP_KEY="..." \
CTRIP_APP_SECURITY="..." \
npm start
# ✅ 应该正常启动
```

---

## 🆘 故障排查

### 问题1: "MONGODB_URI environment variable is required"

**原因**: 生产环境未设置数据库连接串

**解决**:
```bash
# 检查环境变量
echo $MONGODB_URI

# 如果为空，设置环境变量
export MONGODB_URI="mongodb+srv://..."
```

### 问题2: "JWT token verification failed"

**原因**: JWT_SECRET不一致或未设置

**解决**:
```bash
# 确保所有服务器使用相同的JWT_SECRET
# 检查 .env 文件或环境变量
```

### 问题3: 数据库连接失败

**检查清单**:
- [ ] MongoDB服务是否运行？
- [ ] 连接串格式是否正确？
- [ ] 网络是否可达？
- [ ] 用户名密码是否正确？
- [ ] 数据库名称是否存在？

---

## 📚 相关文档

- [MongoDB连接串格式](https://docs.mongodb.com/manual/reference/connection-string/)
- [JWT最佳实践](https://tools.ietf.org/html/rfc8725)
- [12-Factor App配置](https://12factor.net/config)
- [OWASP密钥管理](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

---

## 🔄 密钥轮换流程

### 步骤1: 生成新密钥
```bash
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New JWT Secret: $NEW_JWT_SECRET"
```

### 步骤2: 更新生产环境
```bash
# 1. 备份当前 .env
cp .env .env.backup

# 2. 更新 .env 文件
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env

# 3. 重启服务
pm2 restart all
```

### 步骤3: 通知用户
- JWT密钥更改会使所有现有token失效
- 用户需要重新登录

---

## 📞 联系方式

如需获取生产环境密钥，请联系：
- DevOps团队: devops@example.com
- 系统管理员: admin@example.com

---

**最后更新**: 2025-12-06  
**版本**: 1.0

