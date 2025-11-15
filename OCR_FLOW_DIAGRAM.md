# OCR识别流程说明

## 当前流程

### 1. 文件上传
```
用户上传发票（图片/PDF）
    ↓
routes/invoices.js (POST /invoices/upload)
    ↓
ocrService.recognizeInvoice() 或 recognizePDFInvoice()
```

### 2. OCR识别（直接调用OCR AI）
```
ocrService.recognizeInvoiceWithMistral()
    ↓
mistralClient.ocr.process({
  model: 'mistral-ocr-2505',
  document: {
    imageUrl: { url: dataUrl },  // 图片
    或
    documentUrl: dataUrl          // PDF
  }
})
    ↓
OCR API 直接识别图片/PDF文件
    ↓
返回: { pages: [{ markdown, ... }], model, usage_info }
```

### 3. 文本提取（提取全部文本）
```
从OCR结果中提取全部markdown文本
    ↓
textContent = result.pages
  .sort((a, b) => a.index - b.index)  // 按页码排序
  .map(page => page.markdown || '')  // 提取每页文本
  .filter(text => text.trim().length > 0)  // 过滤空页
  .join('\n\n')  // 合并所有页面
  
✓ 提取全部文本，不截断
✓ 保留所有页面内容
✓ 记录文本统计信息（字符数、行数等）
```

### 4. 文本清理（保留全部内容）
```
cleanOCRMarkdown(textContent)
    ↓
清理操作：
- 移除图片引用
- 移除空表格行
- 移除重复空行
- ✓ 不限制长度（保留全部文本）
    ↓
返回清理后的完整文本
```

### 5. 结构化数据解析（使用Chat API，发送完整文本）
```
parseInvoiceDataWithAI(cleanedText)
    ↓
mistralClient.chat.complete({
  model: 'mistral-small-latest',
  messages: [
    { role: 'system', content: '发票识别提示词...' },
    { role: 'user', content: cleanedText }  // ✓ 完整文本，不截断
  ],
  responseFormat: { type: 'json_object' }
})
    ↓
返回结构化JSON数据
    ↓
字段映射（Seller → vendorName等）
    ↓
返回最终结果
```

## 完整流程图

```
上传文件（图片/PDF）
    ↓
[1] OCR API（直接识别文件，提取全部文本）
    mistral-ocr-2505
    ↓
提取全部markdown文本（不截断）
    - 合并所有页面的文本
    - 保留完整内容
    ↓
[2] 文本清理（移除无用格式，保留全部内容）
    - 移除图片引用
    - 移除空表格行
    - 移除重复空行
    - 不限制长度（提取全部文本）
    ↓
[3] Chat API（解析完整文本为结构化数据）
    mistral-small-latest
    - 发送完整文本（不截断）
    - 解析为JSON格式
    ↓
[4] 字段映射（Seller → vendorName等）
    ↓
返回结构化发票数据
```

## 关键点

### ✅ 直接调用OCR AI
- **OCR API**：`mistralClient.ocr.process()` 直接处理图片/PDF文件
- 不需要预处理或转换
- 支持图片（JPEG, PNG等）和PDF文件

### ✅ 三步处理流程
1. **OCR API**：从图片/PDF中提取全部文本（markdown格式，不截断）
2. **文本清理**：移除无用格式，但保留全部内容
3. **Chat API**：将完整文本解析为结构化JSON数据

### ✅ 提取全部文本

**OCR API的作用：**
- 直接从图片/PDF中识别文字
- 返回markdown格式的文本
- ✓ **提取全部文本，不截断**
- ✓ **合并所有页面的内容**
- 不进行结构化解析

**文本清理的作用：**
- 移除图片引用、空表格行等无用格式
- ✓ **保留全部文本内容**
- ✓ **不限制长度**

**Chat API的作用：**
- 理解发票文本的语义
- 提取结构化字段（发票号码、金额、销售方等）
- 处理中英文发票格式差异
- 字段映射和验证
- ✓ **接收完整文本进行分析**

## API调用详情

### OCR API调用
```javascript
const result = await mistralClient.ocr.process({
  model: 'mistral-ocr-2505',
  document: {
    // 图片
    imageUrl: { url: 'data:image/jpeg;base64,...' },
    type: 'image_url'
    // 或
    // PDF
    documentUrl: 'data:application/pdf;base64,...',
    type: 'document_url'
  }
});
```

### Chat API调用
```javascript
const result = await mistralClient.chat.complete({
  model: 'mistral-small-latest',
  messages: [
    {
      role: 'system',
      content: '你是一个专业的发票识别助手...'
    },
    {
      role: 'user',
      content: '请从以下发票文本中提取信息：\n\n[OCR提取的文本]'
    }
  ],
  temperature: 0.1,
  responseFormat: { type: 'json_object' }
});
```

## 性能考虑

### OCR API
- **耗时**：取决于文件大小和复杂度
- **优势**：直接处理文件，无需预处理
- **限制**：返回文本，不返回结构化数据

### Chat API
- **耗时**：取决于文本长度
- **优势**：理解语义，提取结构化数据
- **限制**：需要OCR先提取文本

## 优化建议

### 当前方案的优势
1. ✅ **直接调用OCR AI**：无需本地OCR库
2. ✅ **高准确率**：Mistral OCR模型识别准确
3. ✅ **结构化解析**：Chat API理解语义
4. ✅ **支持多语言**：中英文发票都支持

### 可能的优化方向
1. **缓存OCR结果**：相同文件不重复OCR
2. **并行处理**：多页PDF并行OCR
3. **批量处理**：多张发票批量识别

## 错误处理

### OCR API失败
- 降级到Chat API方法（直接发送图片给Chat API）

### Chat API失败
- 返回空数据，记录错误日志
- 不影响文件上传

## 日志输出

### OCR阶段
```
OCR识别的原始文本统计:
- 总字符数: [完整字符数]
- 总行数: [总行数]
- 前500字符预览: [预览]
- 后500字符预览: [预览]
✓ OCR已提取全部文本，将完整发送给AI解析
```

### 文本清理阶段
```
文本清理统计:
- 原始文本长度: [字符数]
- 清理后长度: [字符数]
- 保留比例: [百分比]%
- 前800字符预览: [预览]
- 后800字符预览: [预览]
✓ 已清理文本格式，将完整发送给AI解析（不截断）
```

### 解析阶段
```
正在使用 AI 解析发票文本为结构化数据...
- 发送文本长度: [字符数]
- 使用模型: mistral-small-latest
- 文本将完整发送（不截断）

AI解析的原始数据:
{ "invoiceNumber": "...", ... }
字段映射后的数据:
{ "vendorName": "...", ... }
```

## 总结

**文件识别流程：**
1. ✅ **直接调用OCR AI** - `mistralClient.ocr.process()` 直接处理文件
2. ✅ **提取文本** - 从OCR结果中提取markdown文本
3. ✅ **Chat API解析** - 将文本解析为结构化数据
4. ✅ **字段映射** - 确保字段名与前端对应

这是当前最优的实现方式，充分利用了Mistral AI的OCR和Chat能力。

