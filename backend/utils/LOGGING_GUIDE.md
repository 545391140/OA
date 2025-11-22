# 日志和错误处理使用指南

## 📋 概述

本项目使用统一的日志系统和错误处理机制，替代分散的 `console.log` 和错误处理。

## 🔧 日志系统

### 导入日志模块

```javascript
const logger = require('../utils/logger');
```

### 日志级别

- `logger.error()` - 错误日志（生产环境）
- `logger.warn()` - 警告日志
- `logger.info()` - 信息日志
- `logger.http()` - HTTP 请求日志
- `logger.debug()` - 调试日志（仅开发环境）

### 使用示例

```javascript
// 错误日志
logger.error('Failed to connect to database:', error);

// 警告日志
logger.warn('Rate limit exceeded for IP:', req.ip);

// 信息日志
logger.info('User logged in:', { userId: user.id, email: user.email });

// HTTP 日志（通常由 morgan 自动记录）
logger.http('GET /api/users');

// 调试日志（仅在开发环境显示）
logger.debug('Request body:', req.body);
```

### 替换 console.log

**之前**:
```javascript
console.log('User created:', user);
console.error('Error:', error);
```

**之后**:
```javascript
logger.info('User created:', { userId: user.id, email: user.email });
logger.error('Error:', error);
```

## 🚨 错误处理

### 导入错误处理模块

```javascript
const { AppError, ErrorFactory } = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
```

### 使用 AppError 类

```javascript
// 创建自定义错误
throw new AppError('User not found', 404);

// 使用便捷方法
throw ErrorFactory.notFound('User not found');
throw ErrorFactory.unauthorized('Invalid credentials');
throw ErrorFactory.forbidden('Access denied');
throw ErrorFactory.validation('Invalid input');
```

### 使用 asyncHandler 包装器

**之前**:
```javascript
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
```

**之后**:
```javascript
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw ErrorFactory.notFound('User not found');
  }
  
  res.json({ success: true, data: user });
}));
```

### 完整示例

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, ErrorFactory } = require('../utils/AppError');
const logger = require('../utils/logger');
const User = require('../models/User');

// GET /api/users/:id
router.get('/:id', protect, asyncHandler(async (req, res) => {
  logger.info('Fetching user:', { userId: req.params.id, requestedBy: req.user.id });
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    logger.warn('User not found:', { userId: req.params.id });
    throw ErrorFactory.notFound('User not found');
  }
  
  logger.info('User fetched successfully:', { userId: user.id });
  res.json({ success: true, data: user });
}));

// POST /api/users
router.post('/', protect, asyncHandler(async (req, res) => {
  logger.info('Creating user:', { email: req.body.email });
  
  // 检查用户是否已存在
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    logger.warn('User already exists:', { email: req.body.email });
    throw ErrorFactory.conflict('User with this email already exists');
  }
  
  const user = await User.create(req.body);
  
  logger.info('User created successfully:', { userId: user.id });
  res.status(201).json({ success: true, data: user });
}));

module.exports = router;
```

## 📝 迁移步骤

### 1. 替换 console.log

查找并替换所有 `console.log`、`console.error`、`console.warn`：

```bash
# 查找所有 console.log
grep -r "console\." backend/routes/
```

### 2. 使用 asyncHandler

将所有路由处理函数包装在 `asyncHandler` 中：

```javascript
// 之前
router.get('/users', async (req, res) => {
  try {
    // ...
  } catch (error) {
    // ...
  }
});

// 之后
router.get('/users', asyncHandler(async (req, res) => {
  // ...
  throw ErrorFactory.notFound('Not found');
}));
```

### 3. 使用 AppError

替换所有手动错误响应：

```javascript
// 之前
return res.status(404).json({ success: false, message: 'Not found' });

// 之后
throw ErrorFactory.notFound('Not found');
```

## ⚠️ 注意事项

1. **日志级别**: 生产环境只记录 `warn` 及以上级别
2. **敏感信息**: 不要在日志中记录密码、token 等敏感信息
3. **错误堆栈**: 生产环境不返回错误堆栈给客户端
4. **性能**: 日志写入是异步的，不会阻塞请求处理

## 🔍 日志文件位置

- `backend/logs/error.log` - 错误日志
- `backend/logs/combined.log` - 所有日志

## 📚 参考

- [Winston 文档](https://github.com/winstonjs/winston)
- [Express 错误处理](https://expressjs.com/en/guide/error-handling.html)

