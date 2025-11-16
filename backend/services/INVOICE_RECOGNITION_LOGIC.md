# 发票识别分析逻辑整理文档

## 📋 概述

本文档说明发票识别服务的完整分析逻辑，包括 OCR 识别、数据解析、验证和清理流程。

## 🔄 完整识别流程

```
┌─────────────────────────────────────────────────────────┐
│  1. 文件上传 (图片/PDF)                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. OCR 识别阶段 (Fallback 策略)                        │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ 第一步: Mistral AI OCR              │               │
│  │ - recognizeInvoiceWithMistral()     │               │
│  │ - 返回: markdown 文本                │               │
│  └──────────────────────────────────────┘               │
│           ↓                                              │
│  ┌──────────────────────────────────────┐               │
│  │ 完整性检查                           │               │
│  │ - isRecognitionComplete()            │               │
│  │ - 检查关键字段:                      │               │
│  │   • invoiceNumber                    │               │
│  │   • vendorName                       │               │
│  │   • amount                           │               │
│  │   • totalAmount                      │               │
│  └──────────────────────────────────────┘               │
│           ↓                                              │
│    完整? ──是──→ 返回结果 ✓                             │
│           │                                              │
│          否                                              │
│           ↓                                              │
│  ┌──────────────────────────────────────┐               │
│  │ 第二步: 阿里云 DashScope OCR         │               │
│  │ - recognizeInvoiceWithDashScope()     │               │
│  │ - 返回: JSON 或文本                   │               │
│  └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. 文本清理阶段                                         │
│                                                          │
│  - cleanOCRMarkdown()                                    │
│    • 移除图片引用                                        │
│    • 清理空表格行                                        │
│    • 保留重要信息                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. AI 数据解析阶段                                      │
│                                                          │
│  - parseInvoiceDataWithAI()                             │
│    • 构建详细的系统提示词                                │
│    • 调用 Mistral Chat API                              │
│    • 解析 JSON 响应                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. 数据标准化阶段                                       │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ 步骤 1: 字段映射                     │               │
│  │ - mapFieldNames()                    │               │
│  │   • Seller → vendorName               │               │
│  │   • Buyer → buyerName                 │               │
│  │   • Seller Tax ID → vendorTaxId       │               │
│  └──────────────────────────────────────┘               │
│           ↓                                              │
│  ┌──────────────────────────────────────┐               │
│  │ 步骤 2: 数据标准化                   │               │
│  │ - normalizeInvoiceData()             │               │
│  │   • 日期格式: YYYY-MM-DD             │               │
│  │   • 金额类型转换                     │               │
│  │   • 字符串清理 (trim)                │               │
│  │   • 空值处理 (null → '')            │               │
│  └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  6. 返回结构化数据                                       │
│                                                          │
│  {                                                       │
│    success: boolean,                                     │
│    text: string,                                         │
│    confidence: number,                                   │
│    invoiceData: { ... },                                │
│    rawData: { ... }                                     │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

## 🎯 核心方法说明

### 1. 数据验证方法

#### `isRecognitionComplete(invoiceData)`
**功能**: 检查识别结果是否完整

**关键字段检查**:
- `invoiceNumber` - 发票号（必须）
- `vendorName` - 销售方名称（必须）
- `amount` - 金额（必须）
- `totalAmount` - 价税合计（必须）

**返回**: 
```javascript
{
  isComplete: boolean,
  missingFields: Array<string>
}
```

**使用场景**: 
- Mistral OCR 识别后检查
- 决定是否使用 Fallback OCR

---

### 2. 数据标准化方法

#### `normalizeInvoiceData(invoiceData)`
**功能**: 清理和标准化发票数据

**处理内容**:
1. **日期格式标准化**
   - 支持格式: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY年MM月DD日`, `YY-MM-DD`
   - 统一转换为: `YYYY-MM-DD`

2. **金额字段类型转换**
   - 字符串 → 数字
   - 处理免税标识 (`免税`, `***`, `Tax Exempt`)
   - 移除货币符号和特殊字符

3. **字符串字段清理**
   - 去除首尾空格
   - 处理空值

4. **空值处理**
   - `null` → `''` (空字符串)

**返回**: 标准化后的发票数据对象

---

### 3. 字段映射方法

#### `mapFieldNames(invoiceData)`
**功能**: 将不同格式的字段名映射到标准字段名

**映射规则**:

| 原始字段名 | 标准字段名 |
|-----------|-----------|
| Seller, Vendor, Merchant | vendorName |
| Buyer, Purchaser, Customer | buyerName |
| Seller Tax ID, Vendor Tax ID | vendorTaxId |
| Buyer Tax ID | buyerTaxId |
| Seller Address, Vendor Address | vendorAddress |
| Buyer Address | buyerAddress |

**使用场景**: 
- 兼容中英文发票
- 统一数据格式

---

### 4. OCR 识别方法

#### `recognizeInvoiceWithMistral(filePath, fileType)`
**流程**:
1. 读取文件并转换为 base64
2. 调用 Mistral OCR API (`mistral-ocr-2505`)
3. 提取 markdown 文本
4. 调用 `parseInvoiceDataWithAI()` 解析结构化数据
5. 返回识别结果

#### `recognizeInvoiceWithDashScope(filePath, fileType)`
**流程**:
1. 读取文件并转换为 base64
2. 构建 OCR Prompt（要求返回 markdown 格式）
3. 调用阿里云 OCR API (`qwen-vl-ocr-latest`)
4. **OCR 返回 markdown 格式文本**
5. 调用 `parseInvoiceDataWithAI()` 解析为 JSON
6. 返回识别结果

**注意**: OCR 阶段只负责文本识别，不进行结构化解析

---

### 5. AI 数据解析方法

#### `parseInvoiceDataWithAI(textContent)`
**功能**: 使用 AI 将 OCR 文本解析为结构化 JSON 数据

**流程**:
1. **文本清理**
   - 调用 `cleanOCRMarkdown()` 清理格式

2. **构建提示词**
   - 详细的系统提示词（包含所有字段说明）
   - 用户提示词（包含清理后的文本）

3. **调用 AI API**
   - 模型: `mistral-small-latest`
   - 格式: `responseFormat: { type: 'json_object' }`
   - Temperature: 0.2
   - Max Tokens: 动态计算

4. **解析响应**
   - 提取 JSON 对象
   - 错误处理

5. **数据标准化**
   - 字段映射: `mapFieldNames()`
   - 数据标准化: `normalizeInvoiceData()`

**返回**: 结构化的发票数据对象

---

## 📊 数据流图

```
原始文件 (图片/PDF)
    ↓
OCR 识别阶段（返回 markdown 格式）
    ├─ Mistral AI OCR → markdown 文本
    └─ 阿里云 DashScope OCR → markdown 文本
    ↓
文本清理
    └─ cleanOCRMarkdown()
    ↓
AI 解析阶段（返回 JSON 格式）
    └─ parseInvoiceDataWithAI()
    ↓
字段映射
    └─ mapFieldNames()
    ↓
数据标准化
    └─ normalizeInvoiceData()
    ↓
最终 JSON 数据
```

## 🔍 完整性检查逻辑

### 检查标准

```javascript
const criticalFields = [
  'invoiceNumber',    // 发票号
  'vendorName',       // 销售方名称
  'amount',           // 金额
  'totalAmount'       // 价税合计
];
```

### 检查规则

1. **字段存在性**: 字段必须存在
2. **字符串非空**: 字符串字段不能为空或仅包含空格
3. **数字有效性**: 数字字段不能为 0 或 NaN

### Fallback 触发条件

- ✅ Mistral OCR 识别成功但缺少关键字段
- ✅ Mistral OCR 识别失败（API 错误）
- ✅ Mistral OCR 返回空数据

## 🛠️ 数据标准化规则

### 日期格式

**输入格式**:
- `2022-07-12`
- `2022/07/12`
- `2022年7月12日`
- `22-07-12` (自动补全为 2022)

**输出格式**: `YYYY-MM-DD`

### 金额格式

**输入格式**:
- `"1234.56"`
- `"¥1,234.56"`
- `"1,234.56元"`
- `"免税"` (taxAmount)

**输出格式**: `number` (数字类型)

### 字符串清理

- 去除首尾空格
- `null` → `''`
- 保留中间空格

## 📝 代码结构

```
OCRService
├── 数据验证和完整性检查
│   ├── isRecognitionComplete()
│   ├── normalizeInvoiceData()
│   └── mapFieldNames()
│
├── OCR 识别入口方法
│   ├── recognizeInvoice()          # 图片识别
│   └── recognizePDFInvoice()      # PDF识别
│
├── OCR 识别实现
│   ├── recognizeInvoiceWithMistral()      # 返回 markdown 格式
│   ├── recognizeInvoiceWithMistralChat()  # 返回 markdown 格式
│   └── recognizeInvoiceWithDashScope()   # 返回 markdown 格式
│
├── AI 数据解析
│   └── parseInvoiceDataWithAI()
│
└── 辅助方法
    └── cleanOCRMarkdown()
```

## 🎨 设计原则

1. **单一职责**: 每个方法只负责一个功能
2. **可复用性**: 公共逻辑提取为独立方法
3. **可扩展性**: 易于添加新的 OCR 服务
4. **错误处理**: 优雅降级，不中断流程
5. **日志记录**: 详细的日志便于调试

## 🔧 配置要求

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

## 📈 性能优化

1. **Fallback 策略**: 只在必要时调用第二个 OCR 服务
2. **文本清理**: 减少发送给 AI 的文本量
3. **Token 估算**: 动态计算 max_tokens，避免截断
4. **错误处理**: 快速失败，避免长时间等待

## 🐛 常见问题

### Q: 识别结果不完整怎么办？
A: 系统会自动使用阿里云 OCR 作为补充

### Q: 如何添加新的 OCR 服务？
A: 
1. 初始化客户端
2. 实现识别方法
3. 在入口方法中添加 fallback 逻辑

### Q: 如何自定义完整性检查？
A: 修改 `isRecognitionComplete()` 中的 `criticalFields` 数组

## 📚 相关文档

- [OCR 服务架构文档](./ocrService.md)
- [API 文档](../routes/invoices.js)

