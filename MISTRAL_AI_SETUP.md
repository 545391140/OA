# Mistral AI 发票识别配置指南

## 功能说明

系统已集成 Mistral AI 用于发票识别，可以更准确地识别和提取发票信息。

## 配置步骤

### 1. 获取 Mistral API Key

1. 访问 [Mistral AI 官网](https://mistral.ai/)
2. 注册账号并登录
3. 在控制台中创建 API Key

### 2. 配置环境变量

在 `backend` 目录下创建或编辑 `.env` 文件，添加：

```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

或者直接在 `backend/config.js` 中设置：

```javascript
MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || 'your_mistral_api_key_here'
```

### 3. 重启服务器

配置完成后，重启后端服务器以使配置生效。

## 工作原理

1. **图片识别**：
   - 首先使用传统 OCR（Tesseract.js）提取图片中的文本
   - 然后将提取的文本发送给 Mistral AI 进行智能解析
   - AI 会返回结构化的发票信息（JSON 格式）

2. **PDF 识别**：
   - 对于有文本层的 PDF，直接提取文本并发送给 AI
   - 对于扫描版 PDF（无文本层），提示用户转换为图片格式

## 优势

- **更准确的识别**：AI 可以理解上下文，比正则表达式更准确
- **智能解析**：能够处理各种格式的发票
- **自动降级**：如果 AI 不可用，自动使用传统 OCR 方法

## 注意事项

- 需要有效的 Mistral API Key
- API 调用会产生费用（请查看 Mistral AI 的定价）
- 如果未配置 API Key，系统会自动使用传统 OCR 方法

## 测试

配置完成后，上传一张发票图片或 PDF，系统会自动使用 Mistral AI 进行识别。







