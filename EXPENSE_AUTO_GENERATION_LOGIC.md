# 差旅自动匹配发票生成费用逻辑说明

## 概述

当差旅单状态变为 `completed`（已完成）时，系统会自动匹配发票夹中的发票，并为每个匹配的费用项生成费用申请。所有自动生成的费用都保存到**同一个费用数据库**（Expense 集合），并在费用列表中正常显示。

## 触发机制

### 1. 差旅单状态变更触发

**位置**: `backend/models/Travel.js` - `TravelSchema.post('save')` hook

**触发条件**:
- 差旅单状态变为 `completed`
- 费用申请生成状态为 `pending`
- 不是新建文档（避免创建时误触发）

**代码逻辑**:
```javascript
TravelSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && 
      doc.expenseGenerationStatus === 'pending' &&
      !isNewDocument) {
    // 异步调用自动生成服务
    await expenseMatchService.autoGenerateExpenses(travel);
  }
});
```

### 2. API 手动触发

**位置**: `backend/routes/travel.js` - `POST /api/travel/:id/generate-expenses`

**用途**: 用户可以通过 API 手动触发费用生成

## 自动匹配流程

### 步骤 1: 提取费用预算

**函数**: `extractExpenseBudgets(travel)`

**数据来源**:
- `travel.outboundBudget` - 去程预算
- `travel.inboundBudget` - 返程预算
- `travel.multiCityRoutesBudget` - 多程行程预算

**提取逻辑**:
- 遍历每个费用项的预算
- 提取 `subtotal`、`amount` 或 `total` 字段作为预算金额
- 返回费用项ID、行程类型和预算金额

### 步骤 2: 查询可用发票

**查询条件**:
```javascript
{
  uploadedBy: travel.employee._id,  // 差旅申请人的发票
  status: { $in: ['pending', 'verified'] },  // 待审核或已审核的发票
  relatedExpense: null,  // 未关联到费用申请
  relatedTravel: null,   // 未关联到差旅单
  invoiceDate: {
    $gte: travel.startDate,  // 发票日期在差旅期间
    $lte: travel.endDate
  }
}
```

### 步骤 3: 匹配发票到费用项

**函数**: `matchInvoicesForExpenseItem(invoices, expenseItem, budget, travel, usedInvoiceIds)`

**匹配规则**（总分 100 分，阈值 60 分）:

1. **分类匹配**（40分）
   - 发票分类与费用项分类匹配
   - 例如：交通类发票匹配交通费用项

2. **时间匹配**（30分）
   - 发票日期在差旅开始日期和结束日期之间

3. **地点匹配**（30分，仅交通类）
   - 发票的出发地和目的地与差旅行程匹配
   - 非交通类发票默认给予 30 分

4. **出行人匹配**（10分，仅交通类）
   - 发票中的出行人姓名与差旅申请人匹配
   - 非交通类发票不适用

**发票去重机制**:
- 使用 `usedInvoiceIds` Set 跟踪已匹配的发票
- 确保每张发票只匹配到一个费用项

### 步骤 4: 创建费用申请

**位置**: `backend/services/expenseMatchService.js` - `autoGenerateExpenses()`

**创建逻辑**:
```javascript
const expense = await Expense.create({
  employee: travel.employee._id,  // ✅ 设置为差旅申请人
  travel: travel._id,              // ✅ 关联差旅单
  expenseItem: result.expenseItemId,  // ✅ 关联费用项
  title: `${travel.title} - ${expenseItem.itemName}`,
  description: `自动生成：去程/返程/多程`,
  category: mapExpenseItemCategoryToExpenseCategory(...),
  amount: totalAmount,  // 发票总金额
  currency: travel.currency,
  date: travel.endDate,
  status: 'draft',  // ✅ 草稿状态，等待用户编辑
  relatedInvoices: [...],  // ✅ 关联的发票ID数组
  autoMatched: true,  // ✅ 标记为自动匹配
  matchSource: 'auto',  // ✅ 匹配来源
  matchRules: {...},  // ✅ 匹配规则记录
  vendor: {...}  // 从发票中提取的商户信息
});
```

**关键点**:
- ✅ **使用 `Expense.create()`** - 保存到同一个 Expense 集合（同一数据库）
- ✅ **设置 `employee` 字段** - 确保费用属于差旅申请人
- ✅ **状态为 `draft`** - 用户可以编辑和提交

### 步骤 5: 更新发票关联

**更新逻辑**:
```javascript
await Invoice.updateMany(
  { _id: { $in: matchedInvoiceIds } },
  {
    $set: {
      relatedExpense: expense._id,      // 关联费用申请
      relatedTravel: travel._id,        // 关联差旅单
      matchStatus: 'matched',           // 匹配状态
      matchedTravelId: travel._id,
      matchedExpenseItemId: expenseItemId
    }
  }
);
```

### 步骤 6: 更新差旅单

**更新逻辑**:
```javascript
await Travel.updateOne(
  { _id: travelId },
  {
    $set: {
      relatedExpenses: [expense._id, ...],  // 关联的费用申请ID数组
      expenseGenerationStatus: 'completed',  // 生成状态
      expenseGeneratedAt: new Date()
    }
  }
);
```

## 费用列表显示

### 查询逻辑

**位置**: `backend/routes/expenses.js` - `GET /api/expenses`

**查询条件**:
```javascript
const query = { employee: req.user.id };  // ✅ 查询当前用户的所有费用
```

**查询结果**:
- ✅ **包含自动生成的费用** - 因为 `employee` 字段设置为差旅申请人
- ✅ **包含手动创建的费用** - 同样通过 `employee` 字段查询
- ✅ **所有费用在同一列表显示** - 没有区分自动生成和手动创建

**Populate 字段**:
- `employee` - 员工信息
- `travel` - 关联的差旅单
- `expenseItem` - 关联的费用项
- `relatedInvoices` - 关联的发票列表
- `approvals.approver` - 审批人信息

## 数据存储确认

### ✅ 费用保存位置

**数据库**: MongoDB  
**集合**: `expenses`（Expense 模型）  
**存储方式**: 使用 `Expense.create()` 创建文档

**确认**:
- ✅ 自动生成的费用和手动创建的费用都保存在**同一个 Expense 集合**
- ✅ 没有独立的数据库或集合
- ✅ 所有费用通过 `employee` 字段区分所有者

### ✅ 费用列表显示

**查询方式**: `Expense.find({ employee: req.user.id })`

**确认**:
- ✅ 自动生成的费用会出现在费用列表中
- ✅ 手动创建的费用也会出现在费用列表中
- ✅ 两者在同一个列表中，通过 `autoMatched` 字段可以区分

## 费用字段说明

### 自动生成费用的特殊字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `autoMatched` | Boolean | `true` 表示自动匹配生成 |
| `matchSource` | String | `'auto'` 表示自动匹配，`'manual'` 表示手动创建 |
| `matchRules` | Object | 记录匹配规则和置信度 |
| `expenseItem` | ObjectId | 关联的费用项ID |
| `travel` | ObjectId | 关联的差旅单ID |
| `relatedInvoices` | Array[ObjectId] | 关联的发票ID数组 |

### 费用状态

- **自动生成**: `status: 'draft'` - 草稿状态，用户可以编辑和提交
- **手动创建**: `status: 'draft'` 或用户选择的状态

## 流程总结

```
差旅单状态变为 completed
    ↓
触发 TravelSchema.post('save') hook
    ↓
调用 expenseMatchService.autoGenerateExpenses()
    ↓
提取费用预算 (extractExpenseBudgets)
    ↓
查询可用发票 (Invoice.find)
    ↓
为每个费用项匹配发票 (matchInvoicesForExpenseItem)
    ↓
创建费用申请 (Expense.create) ✅ 保存到同一数据库
    ↓
更新发票关联 (Invoice.updateMany)
    ↓
更新差旅单关联 (Travel.updateOne)
    ↓
费用出现在费用列表中 ✅ 通过 employee 字段查询
```

## 验证要点

1. ✅ **费用保存位置**: 使用 `Expense.create()`，保存到同一个 Expense 集合
2. ✅ **费用列表显示**: 查询条件 `{ employee: req.user.id }` 会包含自动生成的费用
3. ✅ **数据一致性**: 自动生成的费用和手动创建的费用使用相同的数据模型
4. ✅ **关联关系**: 费用通过 `travel` 和 `expenseItem` 字段关联到差旅单和费用项

## 注意事项

1. **发票去重**: 使用 `usedInvoiceIds` Set 确保每张发票只匹配一个费用项
2. **版本冲突**: 使用 `Travel.updateOne()` 而不是 `travel.save()` 避免 MongoDB 版本冲突
3. **错误处理**: 如果生成失败，会更新 `expenseGenerationStatus: 'failed'` 并记录错误信息
4. **异步执行**: 使用 `setImmediate()` 异步执行，不阻塞差旅单保存操作


