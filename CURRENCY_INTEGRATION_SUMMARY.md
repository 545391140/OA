# 币种管理统一集成总结

## 完成的工作

已将所有使用硬编码币种列表的地方统一改为从币种管理 API 获取数据。

## 更新的文件

### 1. 新增文件
- `frontend/src/hooks/useCurrencies.js` - 统一的币种数据 Hook

### 2. 更新的页面组件

#### ✅ TravelForm.js
- 替换 `CURRENCIES` 为 `useCurrencies()` hook
- 使用 `currencyCodes` 和 `currencyOptions`
- 更新所有币种验证逻辑

#### ✅ ExpenseForm.js
- 替换硬编码币种列表为 `useCurrencies()` hook
- 使用 `currencyOptions` 作为下拉选项

#### ✅ StandardQuery.js
- 替换 `CURRENCIES.map()` 为 `currencyOptions`
- 使用从 API 获取的币种数据

#### ✅ Profile.js
- 替换硬编码币种列表为 `useCurrencies()` hook
- 使用 `currencyOptions` 作为下拉选项

#### ✅ InvoiceDetail.js
- 替换硬编码币种列表为 `useCurrencies()` hook
- 使用 `currencyOptions` 作为下拉选项

#### ✅ Settings.js
- 替换 `useMemo` 中的硬编码币种列表为 `useCurrencies()` hook
- 使用 `currencyOptions` 作为下拉选项

### 3. 更新的工具文件

#### ✅ constants.js
- 添加应用启动时预加载币种数据的逻辑
- 保持向后兼容性

## useCurrencies Hook 使用说明

### 基本用法

```javascript
import { useCurrencies } from '../../hooks/useCurrencies';

const MyComponent = () => {
  const { currencyOptions, currencyCodes, currencies, loading, error, refresh } = useCurrencies();
  
  // currencyOptions: 用于下拉框的选项数组 [{value, label}, ...]
  // currencyCodes: 币种代码数组 ['USD', 'CNY', ...]
  // currencies: 完整的币种对象数组
  // loading: 加载状态
  // error: 错误信息
  // refresh: 刷新函数
};
```

### 选项配置

```javascript
// 包含非活跃币种
const { currencyOptions } = useCurrencies({ includeInactive: true });

// 不自动获取（手动控制）
const { currencyOptions, refresh } = useCurrencies({ autoFetch: false });
```

## 优势

1. **统一数据源**：所有币种数据都从币种管理 API 获取
2. **实时更新**：币种管理页面修改后，其他页面自动使用最新数据
3. **缓存机制**：5分钟缓存，减少 API 调用
4. **错误处理**：API 失败时自动使用默认币种，不影响功能
5. **国际化支持**：自动处理币种名称的国际化显示

## 数据流程

```
币种管理页面 (CurrencyManagement)
    ↓ (CRUD操作)
数据库 (currencies collection)
    ↓ (API: /api/currencies/active)
useCurrencies Hook
    ↓ (缓存 + 国际化处理)
各页面组件 (TravelForm, ExpenseForm, etc.)
```

## 注意事项

1. **向后兼容**：`constants.js` 中的 `CURRENCIES` 仍然可用，但建议使用 `useCurrencies()` hook
2. **缓存时间**：币种数据缓存 5 分钟，如需立即更新可调用 `refresh()` 函数
3. **默认值**：如果 API 不可用或用户未登录，会自动使用默认币种列表
4. **401 错误**：未授权错误会被静默处理，不影响用户体验

## 测试建议

1. 在币种管理页面添加新币种
2. 刷新其他页面，验证新币种是否出现在下拉列表中
3. 禁用某个币种，验证是否从下拉列表中消失
4. 修改币种名称，验证显示是否正确更新

## 后续优化建议

1. 可以考虑添加币种变更的全局通知机制
2. 可以添加币种数据的 WebSocket 实时更新
3. 可以优化缓存策略，支持更细粒度的缓存控制

