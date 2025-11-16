# 发票识别 OCR 服务架构文档

## 概述

发票识别服务采用多级 OCR 识别策略，支持图片和 PDF 格式，通过 AI 分析提取结构化发票数据。

## 识别流程

```
文件上传
    ↓
[1] 识别入口
    ├─ recognizeInvoice(imagePath)      # 图片识别
    └─ recognizePDFInvoice(pdfPath)     # PDF识别
    ↓
[2] OCR 识别阶段（Fallback 策略）
    ├─ 第一步: Mistral AI OCR
    │   ├─ recognizeInvoiceWithMistral()
    │   └─ 检查识别完整性
    │       ├─ 完整 → 返回结果 ✓
    │       └─ 不完整 → 继续
    │
    └─ 第二步: 阿里云 DashScope OCR (Fallback)
        └─ recognizeInvoiceWithDashScope()
    ↓
[3] 文本清理阶段
    └─ cleanOCRMarkdown()              # 清理 OCR 返回的 markdown 格式
    ↓
[4] AI 数据解析阶段
    └─ parseInvoiceDataWithAI()        # 使用 Mistral AI 解析结构化数据
    ↓
[5] 数据验证和清理阶段
    ├─ 字段映射（兼容中英文）
    ├─ 日期格式标准化
    ├─ 金额类型转换
    └─ 空值处理
    ↓
[6] 返回结构化数据
```

## 核心方法说明

### 1. 识别入口方法

#### `recognizeInvoice(imagePath)`
- **功能**: 识别图片格式的发票
- **流程**:
  1. 检查 OCR 服务配置
  2. 尝试 Mistral AI OCR
  3. 检查识别完整性
  4. 如不完整，使用阿里云 OCR Fallback
  5. 返回最佳识别结果

#### `recognizePDFInvoice(pdfPath)`
- **功能**: 识别 PDF 格式的发票
- **流程**: 与图片识别相同

### 2. OCR 识别方法

#### `recognizeInvoiceWithMistral(filePath, fileType)`
- **功能**: 使用 Mistral AI OCR API 识别发票
- **特点**:
  - 支持图片和 PDF
  - 返回 markdown 格式文本
  - 自动提取多页内容
- **返回**: `{ success, text, confidence, invoiceData, rawData }`

#### `recognizeInvoiceWithDashScope(filePath, fileType)`
- **功能**: 使用阿里云 DashScope OCR 识别发票
- **特点**:
  - 使用 qwen-vl-ocr-latest 模型
  - **OCR 阶段返回 markdown 格式文本**（所见即所得）
  - 然后使用 AI 解析为 JSON 格式
  - 支持图片和 PDF
- **返回**: `{ success, text, confidence, invoiceData, rawData }`

### 3. 数据解析方法

#### `parseInvoiceDataWithAI(textContent)`
- **功能**: 使用 AI 将 OCR 文本解析为结构化 JSON 数据
- **流程**:
  1. 清理 markdown 格式
  2. 构建详细的系统提示词
  3. 调用 Mistral Chat API
  4. 解析 JSON 响应
  5. 字段映射和验证
- **返回**: 结构化的发票数据对象

### 4. 辅助方法

#### `isRecognitionComplete(invoiceData)`
- **功能**: 检查识别结果是否完整
- **关键字段**:
  - `invoiceNumber` - 发票号
  - `vendorName` - 销售方名称
  - `amount` - 金额
  - `totalAmount` - 价税合计
- **返回**: `boolean`

#### `cleanOCRMarkdown(textContent)`
- **功能**: 清理 OCR 返回的 markdown 格式文本
- **处理**:
  - 移除图片引用
  - 清理空表格行
  - 保留重要信息

## 数据结构

### 识别结果格式

```javascript
{
  success: boolean,           // 是否成功
  text: string,              // OCR 识别的原始文本
  confidence: number,         // 置信度 (0-100)
  invoiceData: {             // 结构化的发票数据
    invoiceNumber: string,    // 发票号
    invoiceCode: string,     // 发票代码
    invoiceDate: string,      // 发票日期 (YYYY-MM-DD)
    invoiceType: string,      // 发票类型
    amount: number,           // 合计金额（不含税）
    taxAmount: number,        // 税额
    totalAmount: number,      // 价税合计
    currency: string,         // 货币类型
    vendorName: string,       // 销售方名称
    vendorTaxId: string,      // 销售方税号
    vendorAddress: string,    // 销售方地址
    buyerName: string,        // 购买方名称
    buyerTaxId: string,       // 购买方税号
    buyerAddress: string,     // 购买方地址
    issuer: string,           // 开票人
    totalAmountInWords: string, // 价税合计大写
    items: Array<{            // 项目明细
      name: string,
      unitPrice: number,
      quantity: number,
      amount: number,
      taxRate: string,
      taxAmount: number
    }>
  },
  rawData: {                 // 原始数据
    text: string,
    words: Array,
    lines: Array,
    fullResponse: Object,
    provider: string         // 'mistral' 或 'dashscope'
  }
}
```

## Fallback 策略

### 触发条件

1. **Mistral AI OCR 失败**
   - API 调用异常
   - 返回错误响应

2. **识别结果不完整**
   - 缺少关键字段（发票号、销售方名称、金额、价税合计）
   - 关键字段为空或无效

### Fallback 流程

```
Mistral AI OCR
    ↓
检查完整性
    ├─ 完整 → 返回结果
    └─ 不完整/失败
        ↓
阿里云 DashScope OCR
    ↓
返回结果（无论是否完整）
```

## 配置要求

### 环境变量

```bash
# Mistral AI (主要 OCR 服务)
MISTRAL_API_KEY=your_mistral_api_key

# 阿里云 DashScope (Fallback OCR 服务)
DASHSCOPE_API_KEY=your_dashscope_api_key
```

### 依赖包

```json
{
  "@mistralai/mistralai": "^latest",
  "openai": "^6.9.0",
  "pdfjs-dist": "^latest"
}
```

## 错误处理

### 常见错误

1. **OCR 服务未配置**
   - 错误: `OCR 服务未配置`
   - 解决: 设置至少一个 API Key

2. **文件不存在**
   - 错误: `文件不存在: {path}`
   - 解决: 检查文件路径

3. **AI 解析失败**
   - 错误: `AI解析失败，无法提取发票数据`
   - 解决: 检查 OCR 文本质量，可能需要手动填写

4. **JSON 解析失败**
   - 错误: `解析 AI 响应失败`
   - 解决: AI 返回格式异常，检查 API 响应

## 性能优化

1. **文本清理**: 移除无用格式，保留关键信息
2. **Token 估算**: 动态计算 max_tokens，避免截断
3. **Fallback 机制**: 确保识别成功率
4. **缓存策略**: 可考虑添加结果缓存

## 扩展性

### 添加新的 OCR 服务

1. 在文件顶部初始化客户端
2. 实现识别方法 `recognizeInvoiceWith{Provider}()`
3. 在 `recognizeInvoice()` 中添加 fallback 逻辑
4. 统一返回格式

### 自定义字段验证

修改 `isRecognitionComplete()` 方法中的 `criticalFields` 数组。

## 日志记录

服务会记录详细的日志信息：
- OCR 调用耗时
- 识别结果统计
- 错误堆栈信息
- 数据清理前后对比

## 最佳实践

1. **优先使用 Mistral AI**: 识别质量更高
2. **完整性检查**: 确保关键字段存在
3. **错误处理**: 优雅降级，不中断流程
4. **日志记录**: 便于问题排查
5. **数据验证**: 清理和标准化数据格式

