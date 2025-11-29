# 携程API配置指南

## 问题修复

✅ **已修复**：`getAllPOIInfo` 函数中的字段名不一致问题
- 将小写的 `auth` 改为大写的 `Auth`，与其他API调用保持一致

## 配置方式

### 方式一：使用环境变量（推荐）

在项目根目录创建 `.env` 文件：

```bash
# 携程商旅API配置
CTRIP_APP_KEY=your_app_key_here
CTRIP_APP_SECURITY=your_app_security_here
```

### 方式二：修改配置文件

编辑 `backend/config.js`：

```javascript
// 携程商旅API配置
CTRIP_APP_KEY: process.env.CTRIP_APP_KEY || 'your_app_key_here',
CTRIP_APP_SECURITY: process.env.CTRIP_APP_SECURITY || 'your_app_security_here'
```

## 当前配置状态

- **AppKey**: `obk_rjwl`
- **AppSecurity**: `eW5(Np%RrUuU#(Z3x$8@kOW(`
- **状态**: API返回"非对接客户"错误（错误代码 5005）

## 错误排查

如果遇到"非对接客户"错误，可能的原因：

1. **API密钥不正确**
   - 检查 `appKey` 和 `appSecurity` 是否正确
   - 确认没有多余的空格或特殊字符

2. **API权限未开通**
   - 联系携程确认账号是否已开通API权限
   - 确认账号是否为"对接客户"

3. **环境配置问题**
   - 测试环境：`https://gateway.fat.ctripqa.com`
   - 生产环境：`https://ct.ctrip.com`
   - 确认使用的环境是否正确

## 测试配置

运行测试脚本验证配置：

```bash
# 测试API连接
node backend/scripts/testCtripApi.js

# 调试API配置（查看详细请求信息）
node backend/scripts/debugCtripApi.js
```

## 字段名规范

### 获取Ticket API
```javascript
{
  "appKey": "...",      // 小写
  "appSecurity": "..."  // 小写
}
```

### 其他API调用
```javascript
{
  "Auth": {              // 大写
    "AppKey": "...",     // 大写
    "Ticket": "..."      // 大写
  },
  // ... 其他参数
}
```

## 更新API密钥

如果需要更新API密钥：

1. **使用环境变量**（推荐）：
   ```bash
   export CTRIP_APP_KEY="new_app_key"
   export CTRIP_APP_SECURITY="new_app_security"
   ```

2. **修改配置文件**：
   编辑 `backend/config.js` 中的默认值

3. **测试新配置**：
   ```bash
   node backend/scripts/testCtripApi.js
   ```

## 注意事项

- ⚠️ 不要将API密钥提交到代码仓库
- ✅ `.env` 文件已在 `.gitignore` 中
- ✅ 生产环境建议使用环境变量
- ✅ 配置更新后需要重启服务器

