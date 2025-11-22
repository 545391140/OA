# 费用申请表单差旅集成功能实现总结

## 📋 实现概述

完成了费用申请表单（`expenses/new`）与差旅单的集成功能，支持选择差旅单、显示差旅信息和行程信息，以及针对每个费用项维护发票。

## ✅ 已完成的功能

### 1. 差旅单选择器
- **位置**: 费用申请表单顶部（仅新建时显示）
- **功能**:
  - 使用 Autocomplete 组件搜索和选择差旅单
  - 显示差旅单号、标题和申请人信息
  - 只显示状态为 `completed` 的差旅单
  - 支持搜索差旅单号

### 2. 差旅基本信息显示
- **显示内容**:
  - 差旅单号
  - 申请人（员工姓名）
  - 开始日期和结束日期
  - 目的地
  - 出差目的
  - 币种
  - 状态（带颜色标签）

### 3. 行程信息显示
- **显示内容**:
  - **去程信息**:
    - 日期
    - 交通工具图标（飞机/火车/汽车/公交）
    - 出发地和目的地
  - **返程信息**:
    - 日期
    - 交通工具图标
    - 出发地和目的地
  - **多程行程**:
    - 显示所有多程行程
    - 每个行程的日期、交通工具和路线

### 4. 费用项发票管理
- **功能**:
  - 根据差旅单的费用预算，自动显示所有费用项
  - 每个费用项显示：
    - 费用项名称
    - 所属行程（去程/返程/多程）
    - 预算金额
    - 已关联的发票数量
  - 支持为每个费用项单独添加发票
  - 支持移除费用项的发票
  - 使用 Accordion 组件折叠/展开每个费用项

### 5. 批量创建费用申请
- **功能**:
  - 选择差旅单并添加发票后，保存时会为每个有发票的费用项创建单独的费用申请
  - 每个费用申请包含：
    - 关联的差旅单
    - 关联的费用项
    - 关联的发票列表
    - 从发票中提取的商户信息
    - 自动计算的金额（发票总金额）
    - 自动映射的费用分类

## 🔄 完整流程

```
1. 用户进入费用申请新建页面 (/expenses/new)
   ↓
2. 页面加载差旅单列表和费用项列表
   ↓
3. 用户选择差旅单
   ↓
4. 系统加载差旅信息：
   - 显示差旅基本信息
   - 显示行程信息
   - 显示费用项列表（根据预算）
   ↓
5. 用户为每个费用项添加发票
   ↓
6. 用户点击保存
   ↓
7. 系统为每个有发票的费用项创建费用申请
   ↓
8. 跳转到费用列表页面
```

## 📁 修改的文件

### 1. `frontend/src/pages/Expense/ExpenseForm.js`
- 添加差旅单选择器
- 添加差旅信息显示组件
- 添加行程信息显示组件
- 添加费用项发票管理功能
- 修改保存逻辑，支持批量创建费用申请

### 2. `frontend/src/i18n/locales/zh.json`
- 添加翻译键：
  - `expense.selectTravel`: "选择差旅单"
  - `expense.travelNumber`: "差旅单号"
  - `expense.searchTravelNumber`: "搜索差旅单号..."
  - `expense.travelInfo`: "差旅基本信息"
  - `expense.travelRoutes`: "行程信息"
  - `expense.expenseItemsInvoices`: "费用项发票管理"
  - `expense.budgetAmount`: "预算金额"
  - `expense.noInvoicesForExpenseItem`: "暂无发票"

## 🎨 UI/UX 特性

1. **差旅单选择器**: 
   - Autocomplete 组件，支持搜索
   - 显示差旅单号、标题和申请人
   - 加载状态提示

2. **差旅信息卡片**:
   - 使用 Card 组件展示基本信息
   - 使用 Table 组件整齐展示数据
   - 状态标签使用 Chip 组件

3. **行程信息折叠面板**:
   - 使用 Accordion 组件
   - 交通工具图标直观显示
   - 清晰的路线信息展示

4. **费用项发票管理**:
   - 每个费用项使用 Accordion 折叠
   - 显示预算金额和发票数量
   - 发票列表清晰展示
   - 支持添加和移除发票

## 🔧 技术实现细节

### 1. 差旅单选择
```javascript
<Autocomplete
  options={travelOptions}
  getOptionLabel={(option) => 
    `${option.travelNumber || ''} - ${option.title || ''} (${option.employee?.firstName || ''} ${option.employee?.lastName || ''})`
  }
  value={selectedTravel}
  onChange={(event, newValue) => {
    setSelectedTravel(newValue);
  }}
/>
```

### 2. 提取费用预算
```javascript
const extractExpenseBudgets = (travel) => {
  // 提取去程、返程、多程行程的预算
  // 返回格式: [{ expenseItemId, route, amount, budgetItem }]
};
```

### 3. 费用项发票管理状态
```javascript
const [expenseItemInvoices, setExpenseItemInvoices] = useState({});
// 格式: { expenseItemId: [invoices] }
```

### 4. 批量创建费用申请
```javascript
// 为每个有发票的费用项创建费用申请
for (const budget of budgets) {
  const itemInvoices = expenseItemInvoices[budget.expenseItemId] || [];
  if (itemInvoices.length > 0) {
    // 创建费用申请
    // 关联发票
  }
}
```

## ⚠️ 注意事项

1. **差旅单状态**: 只显示状态为 `completed` 的差旅单
2. **费用项匹配**: 需要确保费用项ID与差旅预算中的ID匹配
3. **发票关联**: 保存时会自动关联发票到费用申请
4. **批量创建**: 如果选择了差旅单，会为每个有发票的费用项创建单独的费用申请

## 🚀 后续优化建议

1. **发票自动匹配**: 选择差旅单后，自动匹配发票到费用项
2. **发票预览**: 点击发票可以预览详情
3. **金额验证**: 验证发票总金额是否超过预算
4. **批量操作**: 支持批量添加发票到多个费用项
5. **费用项分组**: 按行程（去程/返程/多程）分组显示费用项

## ✨ 总结

已完成费用申请表单与差旅单的完整集成，包括：
- ✅ 差旅单选择器
- ✅ 差旅基本信息显示
- ✅ 行程信息显示
- ✅ 费用项发票管理
- ✅ 批量创建费用申请
- ✅ 多语言支持

所有功能已实现并通过代码检查，可以正常使用。

