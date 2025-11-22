# 差旅费用自动匹配与费用申请设计方案

## 📋 需求概述

1. **费用编辑管理**：费用编辑时要根据差旅单包含的每费用项上传发票，进行管理
2. **自动匹配发票**：差旅结束后，自动匹配发票夹中的发票
3. **自动完成费用申请**：根据匹配结果自动完成费用申请填报
4. **用户编辑提交**：用户可在自动生成的费用申请基础上编辑，然后提交

---

## 🏗️ 系统架构设计

### 1. 数据模型扩展

#### 1.1 Expense 模型扩展

```javascript
// backend/models/Expense.js
{
  // 现有字段...
  
  // 新增字段
  expenseItem: {
    type: mongoose.Schema.ObjectId,
    ref: 'ExpenseItem',  // 关联费用项
    required: false
  },
  
  // 关联的发票（从发票夹匹配）
  relatedInvoices: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Invoice'
  }],
  
  // 自动匹配标记
  autoMatched: {
    type: Boolean,
    default: false
  },
  
  // 匹配来源（用于追踪）
  matchSource: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'manual'
  },
  
  // 匹配规则记录（用于审计）
  matchRules: {
    expenseItemId: mongoose.Schema.ObjectId,
    travelId: mongoose.Schema.ObjectId,
    matchedInvoices: [mongoose.Schema.ObjectId],
    matchedAt: Date,
    confidence: Number  // 匹配置信度 0-100
  }
}
```

#### 1.2 Travel 模型扩展

```javascript
// backend/models/Travel.js
{
  // 现有字段...
  
  // 新增字段
  // 关联的费用申请（自动生成）
  relatedExpenses: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Expense'
  }],
  
  // 费用申请生成状态
  expenseGenerationStatus: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  
  // 费用申请生成时间
  expenseGeneratedAt: {
    type: Date
  },
  
  // 费用申请生成错误信息
  expenseGenerationError: {
    type: String
  }
}
```

#### 1.3 Invoice 模型扩展

```javascript
// backend/models/Invoice.js
{
  // 现有字段...
  
  // 新增字段（已有，需要确认）
  // relatedExpense: 已存在
  // relatedTravel: 已存在
  
  // 匹配状态
  matchStatus: {
    type: String,
    enum: ['unmatched', 'matched', 'linked'],
    default: 'unmatched'
  },
  
  // 匹配的差旅ID（用于匹配算法）
  matchedTravelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel'
  },
  
  // 匹配的费用项ID
  matchedExpenseItemId: {
    type: mongoose.Schema.ObjectId,
    ref: 'ExpenseItem'
  }
}
```

---

## 🔍 自动匹配算法设计

### 2.1 匹配触发时机

**触发条件**：
- 差旅状态从 `in-progress` 或 `approved` 变为 `completed`
- 手动触发：用户点击"生成费用申请"按钮

**触发方式**：
```javascript
// 方式1：差旅状态变更时自动触发
TravelSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && 
      doc.expenseGenerationStatus === 'pending') {
    await autoGenerateExpenses(doc);
  }
});

// 方式2：API接口手动触发
POST /api/travel/:id/generate-expenses
```

### 2.2 匹配规则设计

#### 规则1：时间范围匹配
```javascript
// 发票日期必须在差旅时间范围内
const isDateInRange = (invoiceDate, travelStartDate, travelEndDate) => {
  return invoiceDate >= travelStartDate && invoiceDate <= travelEndDate;
};
```

#### 规则2：费用项分类匹配
```javascript
// 根据发票的category匹配费用项
const categoryMapping = {
  'transportation': ['transport', 'transportation'],
  'accommodation': ['accommodation'],
  'meals': ['meal'],
  'entertainment': ['entertainment'],
  'communication': ['communication'],
  'office_supplies': ['office_supplies'],
  'training': ['training'],
  'other': ['other', 'allowance']
};
```

#### 规则3：出行人信息匹配（交通类发票）
```javascript
// 对于交通类发票，检查出行人信息
const travelerMatch = (invoice, travel) => {
  if (invoice.category !== 'transportation') return true;
  
  // 检查发票中的出行人信息是否与差旅申请人匹配
  if (invoice.traveler && invoice.traveler.name) {
    // 可以匹配姓名、身份证号等
    return invoice.traveler.name === travel.employee.name;
  }
  
  return true; // 无出行人信息时默认匹配
};
```

#### 规则4：地点匹配（交通类发票）
```javascript
// 检查发票中的出发地/目的地是否与差旅匹配
const locationMatch = (invoice, travel) => {
  if (invoice.category !== 'transportation') return true;
  
  if (invoice.traveler) {
    const invoiceDeparture = invoice.traveler.departure;
    const invoiceDestination = invoice.traveler.destination;
    
    // 匹配去程
    const outboundMatch = (
      (invoiceDeparture === travel.outbound.departure || 
       invoiceDeparture === travel.destination) &&
      (invoiceDestination === travel.outbound.destination ||
       invoiceDestination === travel.destination)
    );
    
    // 匹配返程
    const inboundMatch = (
      (invoiceDeparture === travel.inbound.departure ||
       invoiceDeparture === travel.destination) &&
      (invoiceDestination === travel.inbound.destination ||
       invoiceDestination === travel.destination)
    );
    
    return outboundMatch || inboundMatch;
  }
  
  return true;
};
```

### 2.3 匹配算法流程

```javascript
/**
 * 自动匹配发票并生成费用申请
 * @param {Object} travel - 差旅单对象
 */
async function autoGenerateExpenses(travel) {
  try {
    // 1. 更新状态为生成中
    travel.expenseGenerationStatus = 'generating';
    await travel.save();
    
    // 2. 获取差旅单的费用预算
    const expenseBudgets = extractExpenseBudgets(travel);
    // expenseBudgets 结构：
    // [
    //   { expenseItemId: 'xxx', route: 'outbound', amount: 1000 },
    //   { expenseItemId: 'yyy', route: 'inbound', amount: 800 },
    //   ...
    // ]
    
    // 3. 查询发票夹中未匹配的发票
    const availableInvoices = await Invoice.find({
      uploadedBy: travel.employee,
      status: { $in: ['pending', 'verified'] },
      relatedExpense: null,  // 未关联费用
      relatedTravel: null,   // 未关联差旅
      invoiceDate: {
        $gte: travel.startDate,
        $lte: travel.endDate
      }
    });
    
    // 4. 为每个费用项匹配发票
    const matchedResults = [];
    
    for (const budget of expenseBudgets) {
      const expenseItem = await ExpenseItem.findById(budget.expenseItemId);
      if (!expenseItem) continue;
      
      // 匹配发票
      const matchedInvoices = matchInvoicesForExpenseItem(
        availableInvoices,
        expenseItem,
        budget,
        travel
      );
      
      if (matchedInvoices.length > 0) {
        matchedResults.push({
          expenseItemId: budget.expenseItemId,
          expenseItem: expenseItem,
          route: budget.route,
          budgetAmount: budget.amount,
          matchedInvoices: matchedInvoices,
          confidence: calculateMatchConfidence(matchedInvoices, budget)
        });
      }
    }
    
    // 5. 生成费用申请
    const generatedExpenses = [];
    
    for (const result of matchedResults) {
      // 计算总金额
      const totalAmount = result.matchedInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0
      );
      
      // 创建费用申请
      const expense = await Expense.create({
        employee: travel.employee,
        travel: travel._id,
        expenseItem: result.expenseItemId,
        title: `${travel.title || travel.travelNumber} - ${result.expenseItem.itemName}`,
        description: `自动生成：${result.route === 'outbound' ? '去程' : result.route === 'inbound' ? '返程' : '多程'}`,
        category: mapExpenseItemCategoryToExpenseCategory(result.expenseItem.category),
        amount: totalAmount,
        currency: travel.currency || 'CNY',
        date: travel.endDate || new Date(),
        status: 'draft',  // 草稿状态，等待用户编辑
        relatedInvoices: result.matchedInvoices.map(inv => inv._id),
        autoMatched: true,
        matchSource: 'auto',
        matchRules: {
          expenseItemId: result.expenseItemId,
          travelId: travel._id,
          matchedInvoices: result.matchedInvoices.map(inv => inv._id),
          matchedAt: new Date(),
          confidence: result.confidence
        },
        vendor: extractVendorFromInvoices(result.matchedInvoices)
      });
      
      // 更新发票关联
      await Invoice.updateMany(
        { _id: { $in: result.matchedInvoices.map(inv => inv._id) } },
        {
          $set: {
            relatedExpense: expense._id,
            relatedTravel: travel._id,
            matchStatus: 'matched'
          }
        }
      );
      
      generatedExpenses.push(expense);
    }
    
    // 6. 更新差旅单
    travel.relatedExpenses = generatedExpenses.map(exp => exp._id);
    travel.expenseGenerationStatus = 'completed';
    travel.expenseGeneratedAt = new Date();
    await travel.save();
    
    // 7. 发送通知给用户
    await notifyExpenseGenerated(travel.employee, travel, generatedExpenses);
    
    return {
      success: true,
      generatedCount: generatedExpenses.length,
      expenses: generatedExpenses
    };
    
  } catch (error) {
    // 错误处理
    travel.expenseGenerationStatus = 'failed';
    travel.expenseGenerationError = error.message;
    await travel.save();
    
    throw error;
  }
}

/**
 * 匹配发票到费用项
 */
function matchInvoicesForExpenseItem(invoices, expenseItem, budget, travel) {
  const matched = [];
  
  for (const invoice of invoices) {
    let score = 0;
    const maxScore = 100;
    
    // 1. 分类匹配（权重：40%）
    const categoryMatch = matchCategory(invoice.category, expenseItem.category);
    score += categoryMatch * 40;
    
    // 2. 时间匹配（权重：30%）
    const dateMatch = isDateInRange(
      invoice.invoiceDate,
      travel.startDate,
      travel.endDate
    ) ? 1 : 0;
    score += dateMatch * 30;
    
    // 3. 地点匹配（交通类，权重：30%）
    const locationMatchScore = locationMatch(invoice, travel) ? 1 : 0;
    score += locationMatchScore * 30;
    
    // 4. 出行人匹配（交通类，额外加分）
    if (invoice.category === 'transportation') {
      const travelerMatchScore = travelerMatch(invoice, travel) ? 10 : 0;
      score += travelerMatchScore;
    }
    
    // 匹配阈值：60分以上认为匹配（非交通类：分类40% + 时间30% = 70分；交通类：分类40% + 时间30% + 地点30% + 出行人10分 = 110分）
    if (score >= 60) {
      matched.push({
        invoice: invoice,
        score: score
      });
    }
  }
  
  // 按分数排序，返回匹配的发票
  return matched
    .sort((a, b) => b.score - a.score)
    .map(item => item.invoice);
}

/**
 * 提取差旅单的费用预算
 */
function extractExpenseBudgets(travel) {
  const budgets = [];
  
  // 去程预算
  if (travel.outboundBudget && typeof travel.outboundBudget === 'object') {
    Object.keys(travel.outboundBudget).forEach(expenseItemId => {
      budgets.push({
        expenseItemId: expenseItemId,
        route: 'outbound',
        amount: travel.outboundBudget[expenseItemId]
      });
    });
  }
  
  // 返程预算
  if (travel.inboundBudget && typeof travel.inboundBudget === 'object') {
    Object.keys(travel.inboundBudget).forEach(expenseItemId => {
      budgets.push({
        expenseItemId: expenseItemId,
        route: 'inbound',
        amount: travel.inboundBudget[expenseItemId]
      });
    });
  }
  
  // 多程行程预算
  if (travel.multiCityRoutesBudget && Array.isArray(travel.multiCityRoutesBudget)) {
    travel.multiCityRoutesBudget.forEach((routeBudget, index) => {
      if (routeBudget && typeof routeBudget === 'object') {
        Object.keys(routeBudget).forEach(expenseItemId => {
          budgets.push({
            expenseItemId: expenseItemId,
            route: `multiCity-${index}`,
            amount: routeBudget[expenseItemId]
          });
        });
      }
    });
  }
  
  return budgets;
}
```

---

## 🔌 API 接口设计

### 3.1 生成费用申请

```javascript
// POST /api/travel/:id/generate-expenses
// 为差旅单自动生成费用申请

router.post('/:id/generate-expenses', protect, async (req, res) => {
  try {
    const travel = await Travel.findById(req.params.id);
    
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel not found'
      });
    }
    
    // 权限检查：只能为自己的差旅生成费用申请
    if (travel.employee.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 检查是否已经生成过
    if (travel.expenseGenerationStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Expenses already generated',
        data: {
          expenses: travel.relatedExpenses
        }
      });
    }
    
    // 执行自动生成
    const result = await autoGenerateExpenses(travel);
    
    res.json({
      success: true,
      message: `Successfully generated ${result.generatedCount} expense(s)`,
      data: result
    });
    
  } catch (error) {
    console.error('Generate expenses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate expenses'
    });
  }
});
```

### 3.2 获取差旅关联的费用申请

```javascript
// GET /api/travel/:id/expenses
// 获取差旅单关联的所有费用申请

router.get('/:id/expenses', protect, async (req, res) => {
  try {
    const travel = await Travel.findById(req.params.id)
      .populate('relatedExpenses');
    
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel not found'
      });
    }
    
    // 权限检查
    if (travel.employee.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 获取费用申请的详细信息
    const expenses = await Expense.find({
      _id: { $in: travel.relatedExpenses }
    })
      .populate('expenseItem', 'itemName category')
      .populate('relatedInvoices', 'invoiceNumber invoiceDate amount vendor')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
    
  } catch (error) {
    console.error('Get travel expenses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get expenses'
    });
  }
});
```

### 3.3 费用申请关联发票

```javascript
// POST /api/expenses/:id/link-invoice
// 手动关联发票到费用申请

router.post('/:id/link-invoice', protect, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    
    const expense = await Expense.findById(req.params.id);
    const invoice = await Invoice.findById(invoiceId);
    
    if (!expense || !invoice) {
      return res.status(404).json({
        success: false,
        message: 'Expense or invoice not found'
      });
    }
    
    // 权限检查
    if (expense.employee.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 检查发票是否已被关联
    if (invoice.relatedExpense) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already linked to another expense'
      });
    }
    
    // 关联发票
    if (!expense.relatedInvoices.includes(invoice._id)) {
      expense.relatedInvoices.push(invoice._id);
      await expense.save();
    }
    
    // 更新发票
    invoice.relatedExpense = expense._id;
    invoice.matchStatus = 'linked';
    if (expense.travel) {
      invoice.relatedTravel = expense.travel;
    }
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Invoice linked successfully',
      data: {
        expense: expense,
        invoice: invoice
      }
    });
    
  } catch (error) {
    console.error('Link invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to link invoice'
    });
  }
});
```

### 3.4 费用申请取消关联发票

```javascript
// DELETE /api/expenses/:id/unlink-invoice/:invoiceId
// 取消关联发票

router.delete('/:id/unlink-invoice/:invoiceId', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    const invoice = await Invoice.findById(req.params.invoiceId);
    
    if (!expense || !invoice) {
      return res.status(404).json({
        success: false,
        message: 'Expense or invoice not found'
      });
    }
    
    // 权限检查
    if (expense.employee.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // 取消关联
    expense.relatedInvoices = expense.relatedInvoices.filter(
      id => id.toString() !== invoice._id.toString()
    );
    await expense.save();
    
    invoice.relatedExpense = null;
    invoice.matchStatus = 'unmatched';
    await invoice.save();
    
    res.json({
      success: true,
      message: 'Invoice unlinked successfully'
    });
    
  } catch (error) {
    console.error('Unlink invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unlink invoice'
    });
  }
});
```

---

## 🎨 前端界面设计

### 4.1 差旅详情页 - 费用申请区域

**位置**：差旅详情页底部，新增"费用申请"标签页

**功能**：
1. 显示"生成费用申请"按钮（差旅状态为 `completed` 时显示）
2. 显示已生成的费用申请列表
3. 每个费用申请显示：
   - 费用项名称
   - 金额
   - 关联的发票数量
   - 状态（草稿/已提交）
   - 操作按钮（编辑/删除）

**界面结构**：
```
┌─────────────────────────────────────┐
│ 费用申请                              │
├─────────────────────────────────────┤
│ [生成费用申请] 按钮                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 费用项：交通费                    │ │
│ │ 金额：¥1,000                     │ │
│ │ 关联发票：2张                    │ │
│ │ 状态：草稿                        │ │
│ │ [编辑] [删除]                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 费用项：住宿费                    │ │
│ │ 金额：¥2,000                     │ │
│ │ 关联发票：1张                    │ │
│ │ 状态：已提交                      │ │
│ │ [查看]                           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.2 费用编辑页 - 发票管理区域

**位置**：费用申请编辑页，新增"关联发票"区域

**功能**：
1. 显示已关联的发票列表
2. 支持添加发票（从发票夹选择）
3. 支持移除发票关联
4. 显示发票预览

**界面结构**：
```
┌─────────────────────────────────────┐
│ 关联发票                              │
├─────────────────────────────────────┤
│ [从发票夹添加发票]                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📄 发票号：INV-2024-001          │ │
│ │ 日期：2024-01-15                │ │
│ │ 金额：¥500                      │ │
│ │ 商户：XX酒店                     │ │
│ │ [预览] [移除]                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📄 发票号：INV-2024-002          │ │
│ │ 日期：2024-01-16                │ │
│ │ 金额：¥500                      │ │
│ │ 商户：XX酒店                     │ │
│ │ [预览] [移除]                    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.3 发票选择对话框

**功能**：
1. 显示发票夹中未关联的发票
2. 支持筛选（按分类、日期、金额）
3. 支持多选
4. 显示匹配度提示（如果是自动匹配）

**界面结构**：
```
┌─────────────────────────────────────┐
│ 选择发票                              │
├─────────────────────────────────────┤
│ 筛选：[全部分类 ▼] [日期范围]         │
│                                     │
│ ☑ 📄 INV-2024-001  ¥500  2024-01-15 │
│   商户：XX酒店  [匹配度：85%]         │
│                                     │
│ ☐ 📄 INV-2024-002  ¥300  2024-01-16 │
│   商户：XX餐厅                       │
│                                     │
│ [取消] [确定(已选择2张)]              │
└─────────────────────────────────────┘
```

---

## 📊 数据流程

### 5.1 自动生成费用申请流程

```
1. 差旅状态变更为 completed
   ↓
2. 触发自动匹配算法
   ↓
3. 提取差旅费用预算（outboundBudget, inboundBudget, multiCityRoutesBudget）
   ↓
4. 查询发票夹中未匹配的发票（时间范围、用户匹配）
   ↓
5. 为每个费用项匹配发票（分类、时间、地点匹配）
   ↓
6. 生成费用申请（状态：draft）
   ↓
7. 关联发票到费用申请
   ↓
8. 更新差旅单（relatedExpenses, expenseGenerationStatus）
   ↓
9. 发送通知给用户
```

### 5.2 用户编辑费用申请流程

```
1. 用户查看差旅详情页
   ↓
2. 点击"费用申请"标签页
   ↓
3. 查看自动生成的费用申请列表
   ↓
4. 点击"编辑"按钮
   ↓
5. 进入费用编辑页
   ↓
6. 编辑费用信息（金额、描述、分类等）
   ↓
7. 管理关联发票（添加/移除）
   ↓
8. 保存（状态保持 draft）或提交（状态变为 submitted）
```

---

## 🔧 实现步骤

### 阶段1：数据模型扩展（1-2天）
1. ✅ 扩展 Expense 模型
2. ✅ 扩展 Travel 模型
3. ✅ 扩展 Invoice 模型
4. ✅ 创建数据库迁移脚本

### 阶段2：匹配算法实现（3-5天）
1. ✅ 实现匹配算法核心函数
2. ✅ 实现自动生成费用申请函数
3. ✅ 添加匹配规则配置
4. ✅ 编写单元测试

### 阶段3：API 接口实现（2-3天）
1. ✅ 实现生成费用申请接口
2. ✅ 实现获取差旅费用接口
3. ✅ 实现发票关联/取消关联接口
4. ✅ 添加权限检查

### 阶段4：前端界面实现（5-7天）
1. ✅ 差旅详情页费用申请区域
2. ✅ 费用编辑页发票管理区域
3. ✅ 发票选择对话框
4. ✅ 自动匹配结果展示

### 阶段5：测试与优化（2-3天）
1. ✅ 功能测试
2. ✅ 性能测试
3. ✅ 用户体验优化
4. ✅ 文档编写

---

## ⚠️ 注意事项

1. **匹配精度**：匹配算法需要平衡精度和召回率，避免误匹配和漏匹配
2. **性能优化**：大量发票时，匹配算法需要优化，考虑使用索引和缓存
3. **用户体验**：自动生成的费用申请应该清晰标注，让用户知道哪些是自动匹配的
4. **数据一致性**：确保发票关联的一致性，避免重复关联
5. **错误处理**：匹配失败时要有清晰的错误提示和日志记录
6. **权限控制**：确保用户只能操作自己的费用申请和发票

---

## 📝 后续优化方向

1. **机器学习匹配**：使用机器学习模型提高匹配准确度
2. **批量操作**：支持批量编辑费用申请
3. **匹配规则配置**：允许管理员配置匹配规则和权重
4. **匹配历史**：记录匹配历史，支持回滚和重新匹配
5. **智能推荐**：推荐可能匹配的发票给用户确认

