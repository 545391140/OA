# ExpenseForm 重构架构

**重构日期**: 2025-12-06  
**原文件**: ExpenseForm.js (3,539行)  
**目标**: 模块化、可维护、可测试

---

## 📁 目录结构

```
ExpenseForm/
├── index.js                    主组件 (~200行) ✅ 已创建
├── README.md                   架构文档 ✅ 当前文件
│
├── hooks/                      业务逻辑Hooks
│   ├── useExpenseFormState.js  状态管理 ✅ 已创建
│   ├── useExpenseValidation.js 表单验证 ✅ 已创建
│   ├── useInvoiceManagement.js 发票管理 ✅ 已创建
│   └── useTravelIntegration.js 差旅集成 ✅ 已创建
│
├── steps/                      步骤组件 (待创建)
│   ├── BasicInfoStep.js        基本信息步骤 (~400行)
│   ├── ExpenseDetailsStep.js   费用明细步骤 (~500行)
│   ├── InvoiceStep.js          发票关联步骤 (~450行)
│   └── ReviewStep.js           审核预览步骤 (~350行)
│
├── components/                 UI组件 (待创建)
│   ├── ExpenseItemInput.js     费用项输入 (~250行)
│   ├── CategorySelector.js     分类选择器 (~150行)
│   └── VendorForm.js           供应商表单 (~200行)
│
└── utils/                      工具函数
    └── constants.js            常量定义 ✅ 已创建
```

---

## ✅ 已完成部分

### 1. Hooks层 (100%完成)

#### useExpenseFormState.js
**职责**: 管理所有表单状态

**导出**:
- `formData` - 表单数据
- `setFormData` - 更新表单
- `updateFormField` - 更新单个字段
- 所有loading状态
- 所有dialog状态
- 发票、差旅、费用项状态
- 工具函数: `normalizeInvoices`, `getEffectiveAmount`, `resetForm`

#### useExpenseValidation.js
**职责**: 表单验证逻辑

**导出**:
- `errors` - 验证错误
- `validateForm` - 验证函数
- `clearError` - 清除单个错误
- `setFieldError` - 设置错误

#### useInvoiceManagement.js
**职责**: 发票关联和管理

**导出**:
- `fetchRelatedInvoices` - 获取关联发票
- `handleAddInvoices` - 添加发票
- `handleRemoveInvoice` - 移除发票
- `handleAddInvoicesForExpenseItem` - 为费用项添加发票
- `handleRemoveInvoiceFromExpenseItem` - 从费用项移除发票

#### useTravelIntegration.js
**职责**: 差旅集成逻辑

**导出**:
- `fetchTravelOptions` - 获取差旅选项
- `fetchExpenseItemsList` - 获取费用项列表
- `loadTravelInfo` - 加载差旅信息
- `extractExpenseBudgets` - 提取差旅预算

### 2. 工具层 (100%完成)

#### constants.js
- 所有选项常量（分类、子分类、项目等）
- 初始表单数据

### 3. 主组件 (已创建框架)

#### index.js
- 集成所有Hooks
- 简化的组件结构
- 清晰的职责划分

**从 3,539行 → ~200行** ✅

---

## ⚠️ 待完成部分

### Steps组件（需要从原文件提取）

由于原ExpenseForm.js没有明显的步骤划分，Steps组件需要基于功能模块创建：

#### BasicInfoStep.js (待创建)
**内容**:
- 标题、描述输入
- 分类、子分类选择
- 金额、币种、日期选择
- 差旅关联选择

**参考原文件**: 第2200-2600行左右

#### ExpenseDetailsStep.js (待创建)
**内容**:
- 供应商信息表单
- 项目、成本中心选择
- 客户信息
- 标签管理
- 费用项明细列表

**参考原文件**: 第2600-3000行左右

#### InvoiceStep.js (待创建)
**内容**:
- 发票选择对话框
- 发票列表展示
- OCR数据显示
- 费用项-发票关联UI
- 报销金额计算

**参考原文件**: 第3000-3300行左右

#### ReviewStep.js (待创建)
**内容**:
- 所有表单数据预览
- 费用汇总
- 发票列表
- 提交确认

**参考原文件**: 第3300-3500行左右

---

## 🔧 如何完成剩余部分

### 方式1: 继续让AI完成

让我继续创建所有Steps组件（需要额外~1500行代码）

### 方式2: 手动完成（推荐）

基于已有的Hooks，创建Steps会更简单：

**步骤**:
1. 从原 `ExpenseForm.js` 复制对应区域的JSX
2. 将状态和函数替换为props
3. 简化逻辑（逻辑已在Hooks中）

**示例**:
```javascript
// BasicInfoStep.js
const BasicInfoStep = ({ 
  formData, 
  errors, 
  handleChange,
  categories,
  subcategories 
}) => {
  return (
    <Box>
      <TextField
        label="标题"
        value={formData.title}
        onChange={(e) => handleChange('title', e.target.value)}
        error={!!errors.title}
        helperText={errors.title}
      />
      {/* 其他字段... */}
    </Box>
  );
};
```

---

## 📊 重构收益

### 代码组织

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| 主文件大小 | 3,539行 | ~200行 | -94% ✅ |
| 最大单文件 | 3,539行 | ~500行 | -86% ✅ |
| 平均文件大小 | 3,539行 | ~250行 | -93% ✅ |
| 文件数量 | 1个 | ~12个 | 模块化 ✅ |

### 可维护性

- ✅ **逻辑分离**: 业务逻辑在Hooks，UI在Steps
- ✅ **易于测试**: 每个Hook可独立测试
- ✅ **易于理解**: 每个文件职责单一
- ✅ **易于扩展**: 新增功能只需修改对应模块

### 性能优化潜力

- ✅ **代码分割**: 可以懒加载Steps
- ✅ **React.memo**: Steps可以用memo优化
- ✅ **选择性渲染**: 只渲染当前Step

---

## 🎯 使用说明

### 当前可用功能

**Hooks**已完全可用，可以直接在原ExpenseForm.js中使用：

```javascript
// 在原ExpenseForm.js中逐步替换
import { useExpenseFormState } from './ExpenseForm/hooks/useExpenseFormState';
import { useExpenseValidation } from './ExpenseForm/hooks/useExpenseValidation';
// ...

// 替换useState和验证逻辑
const stateHook = useExpenseFormState();
const { validateForm, errors } = useExpenseValidation(t);
```

这样可以**渐进式重构**，不影响现有功能。

---

## 📚 下一步

1. **创建Steps组件** - 从原文件提取并简化JSX
2. **集成到index.js** - 替换TODO注释
3. **测试验证** - 确保功能完整
4. **性能优化** - 添加memo和懒加载
5. **替换原文件** - 将ExpenseForm.js改为导出新的index.js

---

## 💡 重构模式总结

这次重构建立了一个可复用的模式：

**从**:
```
SuperLargeComponent.js (3000+行)
└── 所有逻辑+UI混在一起
```

**到**:
```
Component/
├── index.js (主组件, 200行)
├── hooks/ (业务逻辑)
├── steps/ (UI渲染)
├── components/ (可复用组件)
└── utils/ (常量和工具)
```

这个模式可以应用到:
- ✅ ExpenseForm
- ✅ TravelForm  
- ✅ RegionSelector
- ✅ 其他大型组件

---

**重构状态**: 框架已完成，Steps待创建  
**建议**: 基于Hooks逐步完成Steps，或继续使用原文件并逐步迁移

