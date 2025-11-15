# OCR识别问题排查指南

## 问题描述

上传发票时未调用AI OCR识别的问题排查和解决方案。

## 快速诊断

运行诊断脚本：

```bash
cd backend
node diagnose-ocr.js
```

该脚本会检查：
1. 配置文件是否存在
2. MISTRAL_API_KEY 是否配置
3. @mistralai/mistralai 包是否安装
4. Mistral客户端是否可正常初始化
5. OCR API 是否可用
6. 上传目录权限

## 常见问题及解决方案

### 1. Mistral API Key 未配置

**症状：**
- 日志显示 "Mistral API Key 未配置"
- OCR识别返回 `success: false`

**解决方案：**

方法1：使用环境变量（推荐）
```bash
# 在 backend/.env 文件中添加
MISTRAL_API_KEY=your_mistral_api_key_here
```

方法2：直接在 config.js 中配置
```javascript
// backend/config.js
MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || 'your_mistral_api_key_here'
```

**注意：** 配置后需要重启服务器。

### 2. @mistralai/mistralai 包未安装

**症状：**
- 日志显示 "Mistral AI 未安装或初始化失败"
- 错误信息包含 "Cannot find module '@mistralai/mistralai'"

**解决方案：**
```bash
cd backend
npm install @mistralai/mistralai
```

### 3. OCR API 不可用

**症状：**
- 日志显示 "Mistral OCR API 不可用"
- 系统降级到 Chat API 方法

**说明：**
这是正常的降级行为。如果 OCR API 不可用，系统会自动使用 Chat API 方法进行识别，功能不受影响。

### 4. 文件路径问题

**症状：**
- 日志显示 "文件不存在" 或 "文件不可读"
- OCR识别失败

**解决方案：**
- 检查上传目录权限
- 确保文件路径正确（系统会自动转换为绝对路径）
- 检查文件系统权限

### 5. API调用失败

**症状：**
- 日志显示 API 调用错误
- 错误信息包含 HTTP 状态码或 API 响应

**可能原因：**
1. API Key 无效或过期
2. API 配额用尽
3. 网络连接问题
4. Mistral API 服务异常

**解决方案：**
1. 验证 API Key 是否有效
2. 检查 API 使用配额
3. 检查网络连接
4. 查看 Mistral API 服务状态

## 日志分析

### 正常流程日志示例

```
========================================
开始OCR识别，文件类型: image/jpeg
文件路径: uploads/invoice_123.jpg
文件大小: 123456 bytes
MISTRAL_API_KEY配置状态: 已配置 (sk-xxxxx...)
绝对路径: /path/to/uploads/invoice_123.jpg
文件是否存在: ✓
文件可读性: ✓
========================================
调用 ocrService.recognizeInvoice()...
========================================
recognizeInvoice 被调用
图片路径: /path/to/uploads/invoice_123.jpg
mistralClient 状态: 已初始化
config.MISTRAL_API_KEY 状态: 已配置 (sk-xxxxx...)
使用 Mistral AI 识别发票图片
========================================
OCR识别耗时: 2345ms
OCR识别结果: {
  success: true,
  confidence: 95,
  hasData: true,
  fieldsCount: 8
}
OCR数据已保存到发票
识别的字段: invoiceNumber, invoiceDate, amount, vendorName, ...
```

### 错误日志示例

**API Key 未配置：**
```
MISTRAL_API_KEY配置状态: 未配置
OCR失败: Mistral AI 未配置，请设置 MISTRAL_API_KEY 环境变量
```

**文件不存在：**
```
文件是否存在: ✗
OCR识别异常: 文件不存在: /path/to/file.jpg
```

**API调用失败：**
```
Mistral OCR API 识别错误: Request failed with status code 401
API响应状态: 401
API响应数据: {"error": "Invalid API key"}
```

## 调试步骤

1. **检查配置**
   ```bash
   cd backend
   node diagnose-ocr.js
   ```

2. **查看服务器启动日志**
   - 查找 "初始化 Mistral AI 客户端" 相关日志
   - 确认客户端是否成功初始化

3. **上传测试文件**
   - 上传一张发票图片
   - 查看控制台输出的详细日志

4. **检查数据库**
   - 查看发票记录的 `ocrData` 字段
   - 确认是否记录了 OCR 尝试信息

## 代码改进说明

### 1. 增强的日志输出

- 在关键步骤添加了详细的日志输出
- 记录文件路径、API调用状态、错误信息等
- 便于快速定位问题

### 2. 错误处理改进

- OCR失败时记录详细的错误信息
- 即使OCR失败，也会在发票记录中保存尝试信息
- 不会因为OCR失败而影响发票上传

### 3. 配置检查

- 启动时检查Mistral客户端初始化状态
- 运行时检查API Key配置状态
- 提供清晰的错误提示

### 4. 诊断工具

- 提供独立的诊断脚本
- 快速检查所有相关配置和依赖
- 提供解决方案建议

## 测试建议

1. **测试正常流程**
   - 配置有效的 API Key
   - 上传发票图片
   - 验证OCR识别结果

2. **测试错误处理**
   - 移除 API Key，测试降级行为
   - 上传无效文件，测试错误处理
   - 模拟API失败，测试重试机制

3. **性能测试**
   - 测试大文件上传
   - 测试并发上传
   - 监控API调用耗时

## 联系支持

如果问题仍然存在，请提供以下信息：

1. 诊断脚本输出
2. 服务器日志（包含OCR相关日志）
3. 错误截图或日志片段
4. 使用的Mistral API Key前缀（前10个字符）


