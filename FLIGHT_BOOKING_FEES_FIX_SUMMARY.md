# FlightBooking price.fees 验证错误修复总结

## 问题描述

在创建机票预订时，遇到 Mongoose 验证错误：

```
FlightBooking validation failed: price.fees.0: Cast to [string] failed for value "[\n' + " { amount: '0.00', type: 'TICKETING' },\n" + " { amount: '0.00', type: 'SUPPLIER' },\n" + " { amount: '0.00', type: 'FORM_OF_PAYMENT' }\n" + ']" (type string) at path "price.fees.0"
```

## 根本原因

1. **Amadeus API 返回的数据中，`price.fees` 字段可能是字符串格式**（而不是数组）
2. **这个字符串格式的 `fees` 被保存到 `flightOffer` Mixed 字段中**
3. **Mongoose 在保存文档时，尝试验证整个文档结构**
4. **当 Mongoose 遇到 `price.fees` 字段时，发现它是字符串而不是数组**
5. **Mongoose 尝试将字符串转换为数组失败，抛出 CastError**

### Schema 定义

```javascript
// FlightBooking Schema
price: {
  fees: [{
    amount: String,
    type: String,
  }],
}
```

`fees` 被定义为对象数组，但实际传入的是字符串化的数组。

## 解决方案

采用**方案2 + 方案4**的组合方案，在多个层面确保数据格式正确：

### 修改1：添加深度清理函数（方案2）

**文件**：`backend/controllers/flightController.js`

在文件顶部添加 `deepCleanPriceFees` 函数，递归删除所有 `price.fees` 字段：

```javascript
/**
 * 深度清理函数：递归删除所有 price.fees 字段，避免格式错误
 */
function deepCleanPriceFees(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanPriceFees(item));
  }
  
  const cleaned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 如果是 price 对象，特殊处理
      if (key === 'price' && obj[key] && typeof obj[key] === 'object') {
        cleaned[key] = {};
        // 只保留安全的字段，完全跳过 fees 字段
        if (obj[key].total) cleaned[key].total = obj[key].total;
        if (obj[key].currency) cleaned[key].currency = obj[key].currency;
        if (obj[key].base) cleaned[key].base = obj[key].base;
        if (obj[key].grandTotal) cleaned[key].grandTotal = obj[key].grandTotal;
        // 不复制 fees 字段
      } else {
        cleaned[key] = deepCleanPriceFees(obj[key]);
      }
    }
  }
  return cleaned;
}
```

### 修改2：使用深度清理函数处理 flightOffer（方案2）

**文件**：`backend/controllers/flightController.js`

在 `createBooking` 函数中，使用深度清理函数：

```javascript
// 深度克隆 flightOffer，避免引用问题
flightOfferToSave = JSON.parse(JSON.stringify(flightOfferToSave));

// 使用深度清理函数，递归删除所有 price.fees 字段
flightOfferToSave = deepCleanPriceFees(flightOfferToSave);
logger.debug('已使用深度清理函数处理 flightOffer，删除所有 price.fees 字段');
```

### 修改3：重建 flightOffer 对象（方案4）

**文件**：`backend/controllers/flightController.js`

在构建 `bookingDoc` 时，重建 `flightOffer` 对象，只保留必要字段：

```javascript
// 重建 flightOffer，只保留必要字段，避免任何潜在的格式问题
const cleanFlightOffer = {
  id: flightOfferToSave.id,
  type: flightOfferToSave.type,
  source: flightOfferToSave.source,
  instantTicketingRequired: flightOfferToSave.instantTicketingRequired,
  nonHomogeneous: flightOfferToSave.nonHomogeneous,
  oneWay: flightOfferToSave.oneWay,
  lastTicketingDate: flightOfferToSave.lastTicketingDate,
  lastTicketingDateTime: flightOfferToSave.lastTicketingDateTime,
  numberOfBookableSeats: flightOfferToSave.numberOfBookableSeats,
  itineraries: flightOfferToSave.itineraries,
  validatingAirlineCodes: flightOfferToSave.validatingAirlineCodes,
  travelerPricings: flightOfferToSave.travelerPricings,
  // 完全不包含 price 字段，避免任何格式问题
};

const bookingDoc = {
  // ...
  flightOffer: cleanFlightOffer, // 使用重建的清洁对象
  // ...
  price: {
    total: String(priceData.total),
    currency: String(priceData.currency || 'USD'),
    base: priceData.base ? String(priceData.base) : undefined,
    fees: finalFees.map(fee => ({
      amount: String(fee.amount || '0.00'),
      type: String(fee.type || 'UNKNOWN'),
    })),
  },
};
```

### 修改4：在 Amadeus API 层额外保护

**文件**：`backend/services/amadeus/flightSearch.js`

在 `confirmFlightPrice` 函数中，添加额外的保护：

```javascript
// 额外保护：完全删除 confirmedOffer.price.fees，避免任何潜在问题
// controller 层会从 responseData.price 或其他位置单独处理 fees
if (confirmedOffer.price && confirmedOffer.price.fees !== undefined) {
  delete confirmedOffer.price.fees;
  logger.debug('价格确认：已删除 confirmedOffer.price.fees，避免格式问题');
}
```

## 修改的文件

1. **backend/controllers/flightController.js**
   - 添加 `deepCleanPriceFees` 函数
   - 使用深度清理函数处理 `flightOffer`
   - 重建 `cleanFlightOffer` 对象，只保留必要字段
   - 更新日志输出

2. **backend/services/amadeus/flightSearch.js**
   - 在 `confirmFlightPrice` 函数中添加额外的 `fees` 字段删除保护

## 解决方案的优势

1. **多层防护**：在 API 层、数据处理层、保存层都进行了清理
2. **不修改 Schema**：避免影响现有数据和其他功能
3. **彻底清理**：递归清理所有嵌套的 `price.fees` 字段
4. **重建对象**：只保留必要字段，避免任何潜在的格式问题
5. **向后兼容**：不影响现有的预订记录和功能

## 测试建议

1. 重启后端服务
2. 测试创建机票预订功能
3. 检查日志输出，确认清理函数正常工作
4. 验证保存到数据库的数据格式正确

## 预期结果

- 不再出现 `Cast to [string] failed` 错误
- `flightOffer` 对象中不包含 `price` 字段
- `price.fees` 字段正确保存为对象数组
- 日志中显示清理过程的调试信息

---

**修复时间**：2025-12-20  
**修复人员**：AI Assistant  
**状态**：✅ 已完成并重启服务
