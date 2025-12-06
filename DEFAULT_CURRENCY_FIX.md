# 默认货币设置修复报告

## 📋 问题描述

用户在个人资料中设置了默认货币，但在创建差旅申请时，货币字段没有使用用户的默认货币，而是固定显示为 `USD`。

## 🔍 问题分析

### 原因
1. **硬编码默认值**: `TravelForm.js` 中 `formData` 的 `currency` 字段初始化为硬编码的 `'USD'`
2. **缺少用户信息读取**: 没有从 `user.preferences.currency` 读取用户设置的默认货币
3. **初始化时机问题**: 组件初始化时，`user` 可能还未加载完成

## ✅ 修复方案

### 1. 创建辅助函数获取默认货币

```javascript
const getDefaultCurrency = (currentUser) => {
  if (currentUser && currentUser.preferences && currentUser.preferences.currency) {
    const userCurrency = currentUser.preferences.currency;
    // 验证货币值是否有效
    const validCurrencies = ['USD', 'CNY', 'JPY', 'KRW', 'EUR'];
    if (validCurrencies.includes(userCurrency)) {
      return userCurrency;
    }
  }
  return 'USD'; // 默认值
};
```

### 2. 使用函数式初始化

```javascript
const [formData, setFormData] = useState(() => ({
  // ... 其他字段
  currency: getDefaultCurrency(user), // 使用用户默认货币（如果user已加载）
  // ...
}));
```

### 3. 添加 useEffect 监听用户信息加载

```javascript
// 使用 useRef 跟踪是否已经设置过货币，避免重复设置
const currencyInitializedRef = useRef(false);

// 新建模式下，设置默认货币为用户个人资料中的货币
useEffect(() => {
  // 只在新建模式下设置，且用户信息已加载，且货币还未初始化
  if (!isEdit && user && user.preferences && user.preferences.currency && !currencyInitializedRef.current) {
    const userCurrency = user.preferences.currency;
    // 验证货币值是否有效
    const validCurrencies = ['USD', 'CNY', 'JPY', 'KRW', 'EUR'];
    if (validCurrencies.includes(userCurrency)) {
      setFormData(prev => {
        // 如果当前货币与用户默认货币不同，则更新
        if (prev.currency !== userCurrency) {
          currencyInitializedRef.current = true;
          return {
            ...prev,
            currency: userCurrency
          };
        }
        return prev;
      });
    }
  }
}, [isEdit, user]);
```

### 4. 在模式切换时重置标记

```javascript
useEffect(() => {
  if (isEdit) {
    fetchTravelData();
    // 编辑模式下，重置货币初始化标记（因为会从API加载数据）
    currencyInitializedRef.current = true;
  } else {
    // 新建模式下，重置货币初始化标记，允许设置用户默认货币
    currencyInitializedRef.current = false;
  }
  // 初始化时更新步骤状态
  updateStepStatus();
}, [id, isEdit]);
```

## 📊 数据流

### 新建差旅申请流程

1. **组件初始化**
   - `useState` 使用函数式初始化
   - 调用 `getDefaultCurrency(user)` 获取默认货币
   - 如果 `user` 已加载，使用 `user.preferences.currency`
   - 如果 `user` 未加载，使用 `'USD'` 作为默认值

2. **用户信息加载后**
   - `useEffect` 检测到 `user` 已加载
   - 检查是否为新建模式（`!isEdit`）
   - 检查货币是否已初始化（`!currencyInitializedRef.current`）
   - 如果用户设置了默认货币，更新 `formData.currency`

3. **编辑模式**
   - 从 API 加载差旅数据时，货币字段会从后端数据中获取
   - `currencyInitializedRef.current` 设置为 `true`，避免被用户默认货币覆盖

### 编辑差旅申请流程

1. **组件初始化**
   - `isEdit = true`
   - `currencyInitializedRef.current = true`（防止被用户默认货币覆盖）

2. **加载差旅数据**
   - 从 API 获取差旅数据
   - 货币字段从后端数据中获取（`data.currency`）

## 🔧 技术细节

### 使用 useRef 的原因

- **避免重复设置**: 防止 `useEffect` 在每次 `user` 对象引用变化时都更新货币
- **性能优化**: 只在首次加载用户信息时设置一次
- **状态管理**: 跟踪货币字段是否已经初始化

### 货币验证

- 验证用户设置的货币值是否在允许的列表中：`['USD', 'CNY', 'JPY', 'KRW', 'EUR']`
- 如果货币值无效，使用默认值 `'USD'`

### 模式切换处理

- **新建 → 编辑**: `currencyInitializedRef.current` 设置为 `true`，使用后端数据
- **编辑 → 新建**: `currencyInitializedRef.current` 重置为 `false`，允许使用用户默认货币

## ✅ 修复效果

### 修复前
- ❌ 差旅申请表单的货币字段固定为 `USD`
- ❌ 用户个人资料中的默认货币设置无效

### 修复后
- ✅ 新建差旅申请时，自动使用用户在个人资料中设置的默认货币
- ✅ 编辑差旅申请时，使用差旅单中保存的货币（不会被用户默认货币覆盖）
- ✅ 如果用户未设置默认货币，使用 `USD` 作为默认值

## 🧪 测试场景

### 场景1: 用户设置了默认货币为 CNY
1. 用户在个人资料中设置默认货币为 `CNY`
2. 创建新的差旅申请
3. **预期**: 货币字段自动显示为 `CNY`

### 场景2: 用户未设置默认货币
1. 用户个人资料中没有设置默认货币（或为 `USD`）
2. 创建新的差旅申请
3. **预期**: 货币字段显示为 `USD`（默认值）

### 场景3: 编辑已有差旅申请
1. 打开一个已保存的差旅申请（货币为 `JPY`）
2. **预期**: 货币字段显示为 `JPY`（从后端数据加载）
3. **预期**: 不会被用户默认货币覆盖

### 场景4: 用户修改了默认货币
1. 用户在个人资料中将默认货币从 `USD` 改为 `CNY`
2. 创建新的差旅申请
3. **预期**: 货币字段自动显示为 `CNY`

## 📝 注意事项

1. **编辑模式**: 编辑已有差旅申请时，货币字段不会被用户默认货币覆盖，而是使用差旅单中保存的货币
2. **用户手动修改**: 如果用户在表单中手动修改了货币，不会被自动覆盖
3. **数据一致性**: 确保后端 `User` 模型中的 `preferences.currency` 字段与前端一致

## 🔄 相关文件

- `frontend/src/pages/Travel/TravelForm.js` - 差旅申请表单
- `backend/models/User.js` - 用户模型（包含 `preferences.currency`）
- `frontend/src/pages/Profile/Profile.js` - 个人资料页面（设置默认货币）

---

**修复日期**: 2025-01-30
**修复人**: AI Assistant
**状态**: ✅ 已修复

