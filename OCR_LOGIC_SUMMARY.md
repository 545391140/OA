# OCR识别逻辑总结

## 当前OCR识别逻辑架构

系统目前有 **3条主要的OCR识别路径**，每条路径都有降级机制：

---

## 📋 主要识别方法

### 1. **图片识别路径** (`recognizeInvoice`)

**入口方法：** `recognizeInvoice(imagePath)`

**调用流程：**
```
recognizeInvoice(imagePath)
  └─> recognizeInvoiceWithMistral(filePath, 'image')
      ├─> [如果 OCR API 可用] mistralClient.ocr.process()
      │   └─> parseInvoiceDataWithAI(textContent) 或 parseInvoiceData(textContent)
      └─> [如果 OCR API 不可用] recognizeInvoiceWithMistralChat(filePath, 'image')
          └─> mistralClient.ocr.process() + mistralClient.chat.complete()
```

**特点：**
- 专门处理图片文件（JPG, PNG, GIF, WEBP）
- 使用 Mistral AI OCR API 作为主要方法
- 自动降级到 Chat API 方法（如果 OCR API 不可用）

---

### 2. **PDF识别路径** (`recognizePDFInvoice`)

**入口方法：** `recognizePDFInvoice(pdfPath, pageNumber)`

**调用流程：**
```
recognizePDFInvoice(pdfPath, pageNumber)
  └─> recognizeInvoiceWithMistral(filePath, 'pdf')
      ├─> [如果 OCR API 可用] mistralClient.ocr.process()
      │   └─> parseInvoiceDataWithAI(textContent) 或 parseInvoiceData(textContent)
      └─> [如果 OCR API 不可用] recognizeInvoiceWithMistralChat(filePath, 'pdf')
          └─> mistralClient.ocr.process() + mistralClient.chat.complete()
```

**特点：**
- 专门处理PDF文件
- Mistral OCR API 可以处理多页PDF
- 同样有降级机制

---

### 3. **核心识别引擎** (`recognizeInvoiceWithMistral`)

**方法：** `recognizeInvoiceWithMistral(filePath, fileType)`

**这是核心识别方法，支持两种模式：**

#### 模式A：Mistral OCR API（优先）
- 使用 `mistralClient.ocr.process()` 直接识别
- 返回 markdown 格式的文本
- 然后使用 AI 解析文本为结构化数据

#### 模式B：Mistral Chat API（降级）
- 如果 OCR API 不可用，调用 `recognizeInvoiceWithMistralChat()`
- 先使用 OCR API 提取文本
- 再使用 Chat API 解析为结构化数据

---

## 🔄 文本解析方法

### **AI解析** (`parseInvoiceDataWithAI`)

**方法：** `parseInvoiceDataWithAI(textContent)`

**流程：**
```
parseInvoiceDataWithAI(textContent)
  ├─> cleanOCRMarkdown(textContent)  // 清理markdown数据
  └─> mistralClient.chat.complete()  // AI解析为JSON
      └─> [如果失败] 返回空数据 {}
```

**特点：**
- 使用 Mistral Chat API 智能解析
- 返回结构化JSON数据
- 如果AI解析失败，返回空数据（不再使用正则表达式降级）

**注意：** 正则表达式解析方案已被移除，现在仅使用AI解析方案。

### **Markdown清理** (`cleanOCRMarkdown`)

**方法：** `cleanOCRMarkdown(textContent)`

**功能：**
- 移除图片引用
- 清理空表格行
- 移除无用信息
- 限制文本长度（避免token过多）

---

## 📊 识别逻辑流程图

```
上传发票
    │
    ├─> [图片] recognizeInvoice()
    │       │
    │       └─> recognizeInvoiceWithMistral('image')
    │               │
    │               ├─> [OCR API 可用] mistralClient.ocr.process()
    │               │       │
    │               │       ├─> parseInvoiceDataWithAI()
    │               │       │       ├─> [成功] 返回AI解析结果
    │               │       │       └─> [失败] parseInvoiceData() 降级
    │               │       │
    │               │       └─> [直接] parseInvoiceData() 降级
    │               │
    │               └─> [OCR API 不可用] recognizeInvoiceWithMistralChat()
    │                       │
    │                       └─> OCR API + Chat API 组合
    │
    └─> [PDF] recognizePDFInvoice()
            │
            └─> recognizeInvoiceWithMistral('pdf')
                    │
                    └─> [同上流程]
```

---

## 🎯 识别策略总结

### 优先级顺序：

1. **Mistral OCR API** (最优)
   - 直接识别图片/PDF
   - 返回markdown文本
   - 使用AI解析为结构化数据

2. **Mistral Chat API** (备选)
   - OCR API提取文本 + Chat API解析
   - 两步处理，但更可靠

### 降级机制：

- ✅ OCR API 不可用 → 使用 Chat API
- ✅ AI解析失败 → 返回空数据（不再使用正则表达式降级）
- ✅ 所有方法失败 → 返回错误信息（不影响发票上传）

**注意：** 正则表达式解析方案已被移除，系统现在完全依赖AI解析。

---

## 📝 辅助方法

### `convertPDFToImage`
- 将PDF转换为图片
- 当前代码中存在但**未使用**
- 保留作为未来扩展

---

## 🔍 当前使用的识别逻辑

**实际调用路径：**

1. **图片识别：**
   ```
   recognizeInvoice() 
   → recognizeInvoiceWithMistral('image')
   → mistralClient.ocr.process() [优先]
   → parseInvoiceDataWithAI() [优先] 或 parseInvoiceData() [降级]
   ```

2. **PDF识别：**
   ```
   recognizePDFInvoice() 
   → recognizeInvoiceWithMistral('pdf')
   → mistralClient.ocr.process() [优先]
   → parseInvoiceDataWithAI() [优先] 或 parseInvoiceData() [降级]
   ```

---

## 📈 总结

**当前有 3 条主要识别路径：**

1. ✅ **图片识别路径** - `recognizeInvoice()`
2. ✅ **PDF识别路径** - `recognizePDFInvoice()`
3. ✅ **核心识别引擎** - `recognizeInvoiceWithMistral()`

**每条路径都包含：**
- Mistral OCR API（主要方法）
- Mistral Chat API（备选方法）
- AI解析（唯一的数据解析方法）

**文本解析方法：**
- AI解析（`parseInvoiceDataWithAI`）- 唯一使用的解析方法
- Markdown清理（`cleanOCRMarkdown`）- 辅助方法

**重要变更：** 正则表达式解析方案已被移除，系统现在完全依赖AI解析。如果AI解析失败，将返回空数据，但不会影响发票上传。

