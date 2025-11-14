# AI 发票识别功能实现总结

## 📋 概述

系统集成了 Mistral AI OCR API 用于发票识别，能够自动识别图片和 PDF 格式的发票，并提取结构化信息。

## 🏗️ 架构设计

### 1. 技术栈
- **OCR 服务**: Mistral AI OCR API (`mistral-ocr-latest`)
- **备选方案**: Tesseract.js (传统 OCR) + Mistral Chat API
- **文件处理**: Sharp (图片预处理), pdfjs-dist (PDF 文本提取)
- **后端框架**: Node.js + Express

### 2. 文件结构
```
backend/
├── services/
│   └── ocrService.js          # OCR 服务核心逻辑
├── routes/
│   └── invoices.js            # 发票路由（集成 OCR）
├── config.js                  # 配置（包含 MISTRAL_API_KEY）
└── .env                       # 环境变量（API Key）
```

## 🔄 工作流程

### 流程图

```
上传发票文件
    ↓
检查文件类型（图片/PDF）
    ↓
检查 Mistral AI 是否配置
    ↓
┌─────────────────────────────┐
│  方案1: Mistral OCR API     │ ← 优先使用
│  - 直接识别图片/PDF         │
│  - 返回 Markdown 文本       │
└─────────────────────────────┘
    ↓ (如果失败)
┌─────────────────────────────┐
│  方案2: Chat API + OCR      │ ← 降级方案
│  - Tesseract OCR 提取文本   │
│  - Mistral Chat 解析信息    │
└─────────────────────────────┘
    ↓ (如果失败)
┌─────────────────────────────┐
│  方案3: 传统 OCR            │ ← 最终降级
│  - Tesseract OCR            │
│  - 正则表达式解析           │
└─────────────────────────────┘
    ↓
提取发票信息
    ↓
自动填充表单
```

## 💻 核心实现

### 1. OCR 服务初始化 (`ocrService.js`)

```javascript
// 初始化 Mistral AI 客户端
const Mistral = require('@mistralai/mistralai').Mistral;
let mistralClient;

if (config.MISTRAL_API_KEY) {
  mistralClient = new Mistral({
    apiKey: config.MISTRAL_API_KEY,
  });
}
```

### 2. 主要识别方法

#### 方法1: `recognizeInvoice()` - 图片识别
```javascript
async recognizeInvoice(imagePath, language = 'chi_sim+eng', useAI = true) {
  // 1. 优先使用 Mistral AI OCR API
  if (useAI && mistralClient) {
    return await this.recognizeInvoiceWithMistral(imagePath, 'image');
  }
  
  // 2. 降级到传统 OCR
  // - 图片预处理（灰度化、锐化）
  // - Tesseract OCR 识别
  // - 正则表达式解析
}
```

#### 方法2: `recognizePDFInvoice()` - PDF 识别 ✅ 已修复
```javascript
async recognizePDFInvoice(pdfPath, pageNumber = 1, useAI = true) {
  // 1. 优先使用 Mistral AI OCR API
  if (useAI && mistralClient) {
    return await this.recognizeInvoiceWithMistral(pdfPath, 'pdf');
  }
  
  // 2. 降级方案（已实现）
  // - 使用 pdfjs-dist 提取PDF文本层
  // - 支持多页PDF（默认第1页）
  // - 如果没有文本层，返回友好错误提示
  // - 兼容不同版本的 pdfjs-dist API
  // - 包含 DOMMatrix polyfill 支持（pdfjs-dist 5.x需要）
}
```

#### 方法3: `recognizeInvoiceWithMistral()` - Mistral OCR API
```javascript
async recognizeInvoiceWithMistral(filePath, fileType = 'image') {
  // 1. 读取文件并转换为 base64
  const fileBuffer = fs.readFileSync(absolutePath);
  const fileBase64 = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${fileBase64}`;
  
  // 2. 构建文档参数
  let documentParam;
  if (fileType === 'pdf') {
    documentParam = {
      documentUrl: dataUrl,
      type: 'document_url',
    };
  } else {
    documentParam = {
      imageUrl: { url: dataUrl },
      type: 'image_url',
    };
  }
  
  // 3. 调用 Mistral OCR API
  const result = await mistralClient.ocr.process({
    model: 'mistral-ocr-latest',
    document: documentParam,
  });
  
  // 4. 解析响应
  // - 从 result.pages[].markdown 提取文本
  // - 使用 parseInvoiceData() 解析发票信息
}
```

### 3. 数据解析 (`parseInvoiceData()`)

使用正则表达式提取发票信息：

```javascript
parseInvoiceData(text) {
  const invoiceData = {};
  
  // 提取发票号
  const invoiceNumberMatch = text.match(
    /(?:发票号码|发票代码|发票号|No\.|NO\.|编号)[\s:：]*([A-Z0-9\-]+)/i
  );
  
  // 提取日期（支持多种格式）
  const datePatterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
  ];
  
  // 提取金额
  const amountPatterns = [
    /(?:金额|总计|合计|价税合计)[\s:：]*[￥¥\$]?\s*(\d+[.,]?\d*)/,
    /[￥¥\$]\s*(\d+[.,]?\d*)/,
  ];
  
  // 提取商户信息（优先匹配"销售方"信息，确保销售方信息正确赋值给商户名称）
  // 支持多种格式：销售方名称、销售方（换行）、商户等
  // 自动清理税号、地址等后缀信息，确保提取的是纯公司名称
  
  // 提取税号（优先匹配"纳税人识别号"，确保纳税人识别号正确赋值给税号字段）
  // 支持多种格式：纳税人识别号、税号、统一社会信用代码等
  // 自动清理空格和连字符，验证税号长度（15-20位）
  
  // 提取地址等...
  
  return invoiceData;
}
```

## 🔌 API 集成点

### 1. 上传时自动识别 (`routes/invoices.js`)

```javascript
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  // 1. 保存发票文件
  const invoice = await Invoice.create(invoiceData);
  
  // 2. 如果是图片或PDF，自动进行 OCR 识别
  if (req.file.mimetype.startsWith('image/') || 
      req.file.mimetype === 'application/pdf') {
    
    let ocrResult;
    if (req.file.mimetype.startsWith('image/')) {
      ocrResult = await ocrService.recognizeInvoice(req.file.path);
    } else {
      ocrResult = await ocrService.recognizePDFInvoice(req.file.path);
    }
    
    // 3. 保存 OCR 结果并自动填充字段
    if (ocrResult.success) {
      invoice.ocrData = {
        extracted: true,
        confidence: ocrResult.confidence,
        rawData: ocrResult.rawData,
        extractedAt: new Date()
      };
      
      // 自动填充识别到的字段
      if (ocrResult.invoiceData.invoiceNumber) {
        invoice.invoiceNumber = ocrResult.invoiceData.invoiceNumber;
      }
      // ... 其他字段
      
      await invoice.save();
    }
  }
});
```

### 2. 前端自动识别 (`InvoiceUpload.js`)

```javascript
const handleFileSelect = async (e) => {
  const selectedFile = e.target.files[0];
  
  // 选择文件后自动触发 OCR
  if (selectedFile.type.startsWith('image/') || 
      selectedFile.type === 'application/pdf') {
    await handleAutoOCR(selectedFile);
  }
};

const handleAutoOCR = async (fileToRecognize) => {
  // 调用后端 OCR API
  const formData = new FormData();
  formData.append('file', fileToRecognize);
  
  const ocrResponse = await apiClient.post(
    '/invoices/recognize-image', 
    formData
  );
  
  // 自动填充表单字段
  if (ocrResponse.data.success) {
    const recognizedData = ocrResponse.data.data.recognizedData;
    setFormData(prev => ({
      ...prev,
      invoiceNumber: recognizedData.invoiceNumber || prev.invoiceNumber,
      invoiceDate: recognizedData.invoiceDate || prev.invoiceDate,
      amount: recognizedData.amount || prev.amount,
      // ... 其他字段
    }));
  }
};
```

## 📊 数据流

### 输入
- **图片**: JPG, PNG, GIF, WebP
- **PDF**: 支持文本层和扫描版（需转换为图片）

### 处理
1. **文件读取** → Base64 编码 → Data URL
2. **API 调用** → Mistral OCR API
3. **响应解析** → Markdown 文本提取
4. **信息提取** → 正则表达式解析
5. **数据验证** → 格式化和清理

### 输出
```javascript
{
  success: true,
  text: "提取的完整文本",
  confidence: 95,
  invoiceData: {
    invoiceNumber: "发票号码",
    invoiceDate: "2024-01-01",
    amount: 1000.00,
    currency: "CNY",
    vendorName: "商户名称",
    vendorTaxId: "税号",
    vendorAddress: "地址"
  },
  rawData: {
    text: "...",
    pages: [...],
    model: "mistral-ocr-2505-completion"
  }
}
```

## 🛡️ 错误处理和降级

### 三级降级机制

1. **第一级**: Mistral OCR API
   - 直接识别，准确度高
   - 失败原因：API 不可用、模型错误、网络问题

2. **第二级**: Chat API + OCR
   - Tesseract OCR 提取文本
   - Mistral Chat API 智能解析
   - 失败原因：Chat API 不可用

3. **第三级**: 传统 OCR
   - Tesseract OCR + 正则表达式
   - 不依赖外部 API，始终可用

### 错误处理示例

```javascript
try {
  // 尝试 Mistral OCR API
  return await this.recognizeInvoiceWithMistral(filePath, fileType);
} catch (error) {
  console.error('Mistral OCR API 失败:', error);
  
  // 降级到 Chat API
  try {
    return await this.recognizeInvoiceWithMistralChat(filePath, fileType);
  } catch (chatError) {
    console.error('Chat API 失败:', chatError);
    
    // 最终降级到传统 OCR
    return await this.recognizeInvoice(filePath, language, false);
  }
}
```

## ⚙️ 配置要求

### 环境变量
```env
MISTRAL_API_KEY=your_api_key_here
```

### 依赖包
```json
{
  "@mistralai/mistralai": "^latest",
  "tesseract.js": "^6.0.1",
  "sharp": "^0.34.5",
  "pdfjs-dist": "^5.4.394"
}
```

## 🎯 关键特性

1. **自动识别**: 上传文件后自动触发 OCR
2. **智能降级**: 多级降级确保功能可用性
3. **多格式支持**: 图片和 PDF 都支持
4. **自动填充**: 识别结果自动填充表单
5. **可视化反馈**: 显示 OCR 状态和置信度
6. **结果展示**: 在详情页显示识别结果和原始文本
7. **销售方信息提取**: ✅ 优化了销售方信息的提取逻辑，确保"销售方"信息正确赋值给"商户名称"字段

## 📈 性能优化

1. **图片预处理**: 灰度化、锐化提高 OCR 准确率
2. **异步处理**: OCR 识别不阻塞上传流程
3. **缓存机制**: 已识别的发票不再重复识别
4. **错误重试**: API 失败时自动降级

## 🔍 调试和监控

- **日志记录**: 详细的 OCR 过程日志
- **响应保存**: 保存完整 API 响应用于调试
- **置信度显示**: 显示识别置信度
- **原始文本**: 可查看 OCR 提取的原始文本

## 📝 使用示例

### 后端调用
```javascript
const ocrResult = await ocrService.recognizeInvoice(imagePath);
if (ocrResult.success) {
  console.log('识别到的发票号:', ocrResult.invoiceData.invoiceNumber);
  console.log('识别到的金额:', ocrResult.invoiceData.amount);
}
```

### 前端调用
```javascript
// 自动识别（上传时）
// 在 InvoiceUpload.js 中自动触发

// 手动识别（详情页）
const response = await apiClient.post(`/invoices/${id}/recognize`);
```

## ✅ 最新更新

### PDF 文件识别修复
- ✅ 修复了 PDF 文件识别问题，支持使用 Mistral AI OCR API 直接识别 PDF
- ✅ 完善了 pdfjs-dist 的集成，包含 DOMMatrix polyfill 支持
- ✅ 改进了 PDF 文本层提取逻辑，兼容不同版本的 pdfjs-dist API
- ✅ 优化了错误处理，对无文本层的 PDF 提供友好提示

### 销售方信息提取优化
- ✅ 优化了"销售方"信息的提取逻辑，确保销售方信息正确赋值给商户名称
- ✅ 支持多种发票格式：销售方名称、销售方（换行）、开票方等
- ✅ 自动清理税号、地址等后缀信息，确保提取的是纯公司名称
- ✅ 使用前瞻断言（lookahead）精确匹配，避免提取到其他字段

### 税号信息提取优化
- ✅ 优化了"纳税人识别号"的提取逻辑，确保纳税人识别号正确赋值给税号字段
- ✅ 优先匹配"纳税人识别号"（最完整的表述），然后匹配"税号"、"统一社会信用代码"等
- ✅ 支持带空格或连字符的税号格式（自动清理）
- ✅ 验证税号长度（15-20位），确保提取的税号格式正确

## 🚀 未来优化方向

1. **结构化输出**: 使用 `document_annotation_format` 获取 JSON 格式
2. **批量处理**: 支持批量发票识别
3. **模板学习**: 针对特定发票格式优化识别
4. **多语言支持**: 扩展支持更多语言
5. **置信度阈值**: 低置信度时提示人工审核
6. **销售方信息增强**: 进一步优化销售方名称提取，支持更多发票格式

