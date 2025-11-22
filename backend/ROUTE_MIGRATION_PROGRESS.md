# 路由文件迁移进度

## ✅ 已完成迁移

### 1. routes/auth.js ✅
- **console.log 数量**: 13 处
- **状态**: ✅ 已完成
- **更新内容**:
  - ✅ 添加 asyncHandler, logger, ErrorFactory 导入
  - ✅ 替换所有 console.log/error/warn 为 logger
  - ✅ 所有路由使用 asyncHandler 包装
  - ✅ 使用 ErrorFactory 替换手动错误响应

### 2. routes/expenses.js ✅
- **console.log 数量**: 36 处
- **状态**: ✅ 已完成
- **更新内容**:
  - ✅ 添加 asyncHandler, logger, ErrorFactory 导入
  - ✅ 替换所有 console.log/error/warn 为 logger
  - ✅ 所有路由使用 asyncHandler 包装
  - ✅ 使用 ErrorFactory 替换手动错误响应

### 3. routes/users.js ✅ (部分完成)
- **console.log 数量**: 6 处
- **状态**: ✅ 部分完成（已更新一个路由作为示例）
- **更新内容**:
  - ✅ 添加 asyncHandler, logger, ErrorFactory 导入
  - ✅ 更新 GET /:id 路由

## ⏳ 待迁移文件

### 高优先级（大量 console.log）

1. **routes/invoices.js** - 154 处 console.log
   - 文件较大，需要分段处理
   - 包含 OCR 相关的大量调试日志

2. **routes/travel.js** - 86 处 console.log
   - 包含费用生成相关的日志

3. **routes/approvals.js** - 39 处 console.log

### 中优先级

4. **routes/roles.js** - 7 处 console.log
5. **routes/reports.js** - 4 处 console.log
6. **routes/positions.js** - 6 处 console.log
7. **routes/departments.js** - 5 处 console.log
8. **routes/dashboard.js** - 7 处 console.log
9. **routes/approvalWorkflows.js** - 6 处 console.log
10. **routes/pushNotifications.js** - 3 处 console.log
11. **routes/notificationTemplates.js** - 6 处 console.log
12. **routes/search.js** - 12 处 console.log
13. **routes/settings.js** - 6 处 console.log
14. **routes/notifications.js** - 5 处 console.log
15. **routes/budgets.js** - 1 处 console.log

## 📊 迁移统计

- **已完成**: 2 个文件（auth.js, expenses.js）
- **部分完成**: 1 个文件（users.js）
- **待迁移**: 15 个文件
- **总计 console.log**: ~402 处
- **已迁移**: ~49 处（12%）

## 🔄 迁移模板

每个文件需要执行以下步骤：

1. **添加导入**:
```javascript
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ErrorFactory } = require('../utils/AppError');
```

2. **替换 console.log**:
```javascript
// 之前
console.log('...');
console.error('...');
console.warn('...');

// 之后
logger.info('...');
logger.error('...');
logger.warn('...');
logger.debug('...'); // 用于调试信息
```

3. **使用 asyncHandler**:
```javascript
// 之前
router.get('/path', async (req, res) => {
  try {
    // ...
  } catch (error) {
    // ...
  }
});

// 之后
router.get('/path', asyncHandler(async (req, res) => {
  // ...
  throw ErrorFactory.notFound('Not found');
}));
```

4. **使用 ErrorFactory**:
```javascript
// 之前
return res.status(404).json({ success: false, message: 'Not found' });

// 之后
throw ErrorFactory.notFound('Not found');
```

## 📝 注意事项

1. **日志级别选择**:
   - `logger.error()` - 错误情况
   - `logger.warn()` - 警告情况
   - `logger.info()` - 重要信息（如操作成功）
   - `logger.debug()` - 调试信息（开发环境）

2. **敏感信息**: 不要在日志中记录密码、token 等敏感信息

3. **错误处理**: 使用 `throw ErrorFactory.xxx()` 而不是 `return res.status().json()`

4. **保持功能**: 确保迁移后功能保持不变

---

**最后更新**: 2025-01-27  
**下次更新**: 继续迁移剩余文件

