# 国际发票支持说明

## 概述

系统已增强对国际（英文）发票的支持，确保无论发票是中文还是英文，都能正确识别并映射到前端字段。

## 字段映射标准

### 前端使用的标准字段名

前端统一使用以下字段名：
- `vendorName` - 销售方名称
- `vendorTaxId` - 销售方税号
- `vendorAddress` - 销售方地址
- `buyerName` - 购买方名称
- `buyerTaxId` - 购买方税号

### 支持的英文发票字段名

系统可以识别以下英文发票常见字段名，并自动映射到标准字段：

**销售方/卖方字段：**
- `Seller` → `vendorName`
- `Vendor` → `vendorName`
- `Merchant` → `vendorName`
- `Seller Name` → `vendorName`
- `From` → `vendorName`

**购买方/买方字段：**
- `Buyer` → `buyerName`
- `Purchaser` → `buyerName`
- `Customer` → `buyerName`
- `Buyer Name` → `buyerName`
- `To` / `Bill To` → `buyerName`

**税号字段：**
- `Seller Tax ID` → `vendorTaxId`
- `Vendor Tax ID` → `vendorTaxId`
- `Buyer Tax ID` → `buyerTaxId`
- `Tax ID` / `Tax Number` / `EIN` / `VAT Number` → 根据上下文映射

**地址字段：**
- `Seller Address` → `vendorAddress`
- `Vendor Address` → `vendorAddress`

## AI提示词增强

### 支持的中英文关键词

**发票号码：**
- 中文：发票号码、发票号
- 英文：Invoice Number、Invoice No.

**开票日期：**
- 中文：开票日期、发票日期
- 英文：Issue Date、Date

**销售方：**
- 中文：销售方、开票方
- 英文：Seller、Vendor、Merchant、From

**购买方：**
- 中文：购买方、买方
- 英文：Buyer、Purchaser、Customer、To、Bill To

**金额字段：**
- 中文：合计金额、金额合计、税额合计、价税合计
- 英文：Subtotal、Amount、Net Amount、Tax Amount、VAT、Tax、Total Amount、Total、Grand Total

**税号：**
- 中文：纳税人识别号、统一社会信用代码
- 英文：Tax ID、Tax Number、EIN、VAT Number

## 字段映射机制

### 双重保障

1. **AI提示词约束**：明确要求AI使用标准字段名返回（vendorName, buyerName等）
2. **后端字段映射**：如果AI返回了英文字段名，自动映射到标准字段名

### 映射逻辑

```javascript
// 示例：如果AI返回了 Seller，自动映射到 vendorName
if (invoiceData.Seller && !invoiceData.vendorName) {
  invoiceData.vendorName = invoiceData.Seller;
  delete invoiceData.Seller;
}
```

## 使用示例

### 中文发票

**输入：**
```
销售方：厦门滴滴出行科技有限公司
购买方：北京星网锐捷网络技术有限公司
```

**输出：**
```json
{
  "vendorName": "厦门滴滴出行科技有限公司",
  "buyerName": "北京星网锐捷网络技术有限公司"
}
```

### 英文发票

**输入：**
```
Seller: ABC Company Inc.
Buyer: XYZ Corporation
```

**输出：**
```json
{
  "vendorName": "ABC Company Inc.",
  "buyerName": "XYZ Corporation"
}
```

即使AI返回了 `Seller` 字段，系统也会自动映射到 `vendorName`。

## 调试日志

系统会输出详细的字段映射日志：

```
AI解析的原始数据: { "Seller": "ABC Company", "Buyer": "XYZ Corp" }
字段映射后的数据: { "vendorName": "ABC Company", "buyerName": "XYZ Corp" }
```

## 支持的货币类型

系统支持以下货币类型：
- `CNY` - 人民币（默认）
- `USD` - 美元
- `EUR` - 欧元
- `JPY` - 日元
- `KRW` - 韩元

## 日期格式支持

支持多种日期格式，统一转换为 `YYYY-MM-DD`：
- `2022年07月12日` → `2022-07-12`
- `2022/07/12` → `2022-07-12`
- `2022-07-12` → `2022-07-12`
- `July 12, 2022` → `2022-07-12`
- `12/07/2022` → `2022-07-12`

## 注意事项

1. **字段优先级**：如果同时存在标准字段名和英文字段名，优先使用标准字段名
2. **大小写敏感**：字段映射不区分大小写（Seller = seller）
3. **空值处理**：如果字段值为 null 或空字符串，不会进行映射
4. **日志记录**：所有字段映射操作都会记录在日志中，便于调试

## 测试建议

1. **中文发票测试**：上传中文发票，确认字段正确识别
2. **英文发票测试**：上传英文发票，确认字段正确映射
3. **混合格式测试**：上传包含中英文混合的发票
4. **日志检查**：查看服务器日志，确认字段映射过程

## 常见问题

### Q: AI返回了Seller字段，但没有映射到vendorName？

A: 检查日志中的"字段映射后的数据"，确认映射是否成功。如果映射失败，可能是字段名不完全匹配，需要添加新的映射规则。

### Q: 如何添加新的字段映射？

A: 在 `ocrService.js` 的字段映射部分添加新的映射规则：

```javascript
if (invoiceData['New Field Name'] && !invoiceData.vendorName) {
  invoiceData.vendorName = invoiceData['New Field Name'];
  delete invoiceData['New Field Name'];
}
```

### Q: 前端如何接收这些字段？

A: 前端使用标准字段名（vendorName, buyerName等），后端会自动映射，前端无需修改。

