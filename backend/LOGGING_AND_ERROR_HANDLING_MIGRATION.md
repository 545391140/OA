# 日志和错误处理系统迁移指南

## ✅ 已完成的工作

### 1. 安装依赖
- ✅ 已安装 `winston` 日志库

### 2. 创建核心工具
- ✅ `utils/logger.js` - 统一的日志系统
- ✅ `utils/AppError.js` - 自定义错误类
- ✅ `utils/asyncHandler.js` - 异步错误处理包装器
- ✅ `middleware/errorHandler.js` - 更新的错误处理中间件

### 3. 更新服务器配置
- ✅ `server.js` - 集成 winston 日志系统
- ✅ 创建日志目录 `backend/logs/`

### 4. 示例更新
- ✅ `routes/users.js` - 更新了一个路由作为示例

## 📋 待迁移的文件

### 需要更新的路由文件（18个）

1. `backend/routes/auth.js` - 13 处 console.log
2. `backend/routes/invoices.js` - 154 处 console.log
3. `backend/routes/travel.js` - 86 处 console.log
4. `backend/routes/expenses.js` - 36 处 console.log
5. `backend/routes/approvals.js` - 39 处 console.log
6. `backend/routes/roles.js` - 7 处 console.log
7. `backend/routes/reports.js` - 4 处 console.log
8. `backend/routes/positions.js` - 6 处 console.log
9. `backend/routes/users.js` - 6 处 console.log（部分已更新）
10. `backend/routes/departments.js` - 5 处 console.log
11. `backend/routes/dashboard.js` - 7 处 console.log
12. `backend/routes/approvalWorkflows.js` - 6 处 console.log
13. `backend/routes/pushNotifications.js` - 3 处 console.log
14. `backend/routes/notificationTemplates.js` - 6 处 console.log
15. `backend/routes/search.js` - 12 处 console.log
16. `backend/routes/settings.js` - 6 处 console.log
17. `backend/routes/notifications.js` - 5 处 console.log
18. `backend/routes/budgets.js` - 1 处 console.log

### 其他需要更新的文件

- `backend/middleware/auth.js` - 10 处 console.log
- `backend/services/` - 多个服务文件
- `backend/controllers/` - 多个控制器文件

## 🔧 迁移步骤

### 步骤 1: 添加导入

在每个路由文件顶部添加：

```javascript
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/AppError');
```

### 步骤 2: 替换 console.log

**查找模式**:
```javascript
console.log('...');
console.error('...');
console.warn('...');
```

**替换为**:
```javascript
logger.info('...');
logger.error('...');
logger.warn('...');
```

### 步骤 3: 使用 asyncHandler

**之前**:
```javascript
router.get('/users', async (req, res) => {
  try {
    // ...
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
```

**之后**:
```javascript
router.get('/users', asyncHandler(async (req, res) => {
  // ...
  throw ErrorFactory.notFound('User not found');
}));
```

### 步骤 4: 使用 ErrorFactory

**之前**:
```javascript
if (!user) {
  return res.status(404).json({ success: false, message: 'User not found' });
}
```

**之后**:
```javascript
if (!user) {
  throw ErrorFactory.notFound('User not found');
}
```

## 📝 迁移检查清单

对于每个路由文件，检查：

- [ ] 已添加必要的导入（asyncHandler, logger, ErrorFactory）
- [ ] 所有 console.log 已替换为 logger.info/debug
- [ ] 所有 console.error 已替换为 logger.error
- [ ] 所有 console.warn 已替换为 logger.warn
- [ ] 所有路由处理函数已使用 asyncHandler 包装
- [ ] 所有手动错误响应已替换为 throw ErrorFactory
- [ ] 移除了 try-catch 块（由 asyncHandler 处理）

## 🚀 快速迁移脚本

可以使用以下命令查找需要更新的文件：

```bash
# 查找所有 console.log
grep -r "console\." backend/routes/ | wc -l

# 查找所有 try-catch 块
grep -r "try {" backend/routes/ | wc -l

# 查找所有手动错误响应
grep -r "res.status(4" backend/routes/ | wc -l
grep -r "res.status(5" backend/routes/ | wc -l
```

## ⚠️ 注意事项

1. **日志级别**: 
   - 开发环境：显示所有级别（debug, info, warn, error）
   - 生产环境：只显示 warn 和 error

2. **敏感信息**: 
   - 不要在日志中记录密码、token、信用卡号等敏感信息
   - 使用对象形式记录结构化数据

3. **错误处理**:
   - 使用 `throw ErrorFactory.xxx()` 而不是 `return res.status().json()`
   - asyncHandler 会自动捕获错误并传递给错误处理中间件

4. **性能**:
   - 日志写入是异步的，不会阻塞请求
   - 避免在高频操作中使用 debug 级别日志

## 📚 参考文档

- [日志使用指南](./utils/LOGGING_GUIDE.md)
- [Winston 官方文档](https://github.com/winstonjs/winston)

## 🎯 优先级建议

### 高优先级（立即迁移）
1. `routes/invoices.js` - 154 处 console.log
2. `routes/travel.js` - 86 处 console.log
3. `routes/expenses.js` - 36 处 console.log
4. `routes/auth.js` - 13 处 console.log

### 中优先级（短期迁移）
5. `routes/approvals.js` - 39 处
6. `routes/users.js` - 6 处（部分已完成）
7. `middleware/auth.js` - 10 处

### 低优先级（长期迁移）
8. 其他路由文件
9. 服务文件
10. 控制器文件

---

**最后更新**: 2025-01-27  
**状态**: 核心系统已就绪，等待逐步迁移

