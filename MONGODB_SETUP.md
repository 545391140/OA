# MongoDB 数据库配置指南

## 📋 当前数据库配置

运行以下命令查看当前配置（密码已隐藏）：
```bash
cd backend
node scripts/checkDatabaseConfig.js
```

## 🚀 方案一：使用 MongoDB Atlas（推荐，免费）

MongoDB Atlas 提供免费的云数据库服务。

### 1. 创建 MongoDB Atlas 账户

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. 注册账户（免费）
3. 验证邮箱

### 2. 创建免费集群

1. 登录后，点击 **Build a Database**
2. 选择 **FREE (M0) Shared** 免费套餐
3. 选择云服务商和区域（推荐选择离你最近的区域）
4. 集群名称保持默认或自定义
5. 点击 **Create**

### 3. 创建数据库用户

1. 在 **Database Access** 页面，点击 **Add New Database User**
2. 选择 **Password** 认证方式
3. 设置：
   - **Username**: `travel-expense-user` (或自定义)
   - **Password**: 点击 **Autogenerate Secure Password** 或自定义
   - ⚠️ **重要**: 保存用户名和密码！
4. 选择用户权限：**Atlas Admin**（开发环境）或 **Read and write to any database**（生产环境）
5. 点击 **Add User**

### 4. 配置网络访问白名单

1. 在 **Network Access** 页面，点击 **Add IP Address**
2. 对于开发环境：
   - 点击 **Add Current IP Address**（添加当前 IP）
   - 或选择 **Allow Access from Anywhere**（`0.0.0.0/0`）⚠️ 仅用于开发
3. 对于生产环境：
   - 添加部署服务器的 IP 地址
   - 或添加 Netlify、Railway、Render 的 IP 范围

### 5. 获取连接字符串

1. 在 **Database** 页面，点击 **Connect**
2. 选择 **Connect your application**
3. 选择驱动：**Node.js**，版本：**5.5 or later**
4. 复制连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. 将 `<username>` 和 `<password>` 替换为刚才创建的用户名和密码
6. 在连接字符串末尾添加数据库名：
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/travel-expense-system?retryWrites=true&w=majority
   ```

### 6. 配置到项目中

在 `backend/.env` 文件中添加：
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/travel-expense-system?retryWrites=true&w=majority
```

⚠️ **安全提醒**：
- 不要将 `.env` 文件提交到 Git
- 密码应该使用强密码
- 生产环境使用独立的数据库用户

## 🖥️ 方案二：本地 MongoDB

### 安装 MongoDB

**macOS (使用 Homebrew)**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows**: 
下载并安装 [MongoDB Community Server](https://www.mongodb.com/try/download/community)

**Linux**:
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 配置连接字符串

**无认证（开发环境）**:
```env
MONGODB_URI=mongodb://localhost:27017/travel-expense-system
```

**有认证**:
```env
MONGODB_URI=mongodb://username:password@localhost:27017/travel-expense-system?authSource=admin
```

## 🔧 验证连接

运行测试脚本：
```bash
cd backend
node scripts/checkDatabaseConfig.js
```

如果连接成功，会显示：
```
✅ 连接成功！
✅ 连接主机: cluster0.xxxxx.mongodb.net
✅ 数据库名: travel-expense-system
```

## 📝 环境变量配置

### 开发环境 (`backend/.env`)

```env
# 数据库
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/travel-expense-system?retryWrites=true&w=majority

# 其他配置
NODE_ENV=development
PORT=3001
JWT_SECRET=your-dev-secret-key
FRONTEND_URL=http://localhost:3000
```

### 生产环境（Railway/Render）

在部署平台的环境变量中配置：
- `MONGODB_URI`: MongoDB Atlas 连接字符串
- `NODE_ENV`: `production`
- `JWT_SECRET`: 强密码（生产环境必须修改）

## 🚨 常见问题

### 问题 1：连接被拒绝

**原因**: IP 地址未添加到白名单

**解决**: 
1. 在 MongoDB Atlas → Network Access
2. 添加当前 IP 或 `0.0.0.0/0`（开发环境）

### 问题 2：认证失败

**原因**: 用户名或密码错误

**解决**:
1. 检查连接字符串中的用户名和密码
2. 确认用户已创建且权限正确
3. 在 MongoDB Atlas 重置密码

### 问题 3：DNS 解析失败

**原因**: 网络问题或连接字符串格式错误

**解决**:
1. 检查网络连接
2. 确认连接字符串格式正确
3. 尝试使用 `mongodb://` 而不是 `mongodb+srv://`

## 🔐 安全最佳实践

1. **使用强密码**: 至少 12 位，包含大小写字母、数字、特殊字符
2. **限制 IP 访问**: 生产环境只允许部署服务器 IP
3. **使用专用用户**: 为每个应用创建独立的数据库用户
4. **定期轮换密码**: 定期更改数据库密码
5. **启用加密**: MongoDB Atlas 默认启用加密传输

## 📞 需要帮助？

如果遇到问题：
1. 检查 MongoDB Atlas 集群状态
2. 确认网络访问白名单配置
3. 运行 `checkDatabaseConfig.js` 查看详细错误信息
4. 查看 MongoDB Atlas 日志

---

**提示**: MongoDB Atlas 免费套餐有 512MB 存储空间，适合开发和小型应用使用。

