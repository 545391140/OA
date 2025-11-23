# 差旅标准修改后，未提交差旅申请编辑时的行为检查

## 检查结果：✅ **会使用新的差旅标准**

## 检查依据

### 1. 前端自动匹配机制

**文件**: `frontend/src/pages/Travel/TravelForm.js`

**关键代码**（第 290-372 行）：

```javascript
// 自动匹配差旅标准并填充预算
useEffect(() => {
  // 编辑模式下，也支持自动匹配（当目的地或日期变化时）
  
  const autoMatchStandard = async () => {
    // ... 匹配逻辑
    routeMatches.outbound = await matchRouteStandard(...);
    // ...
  };

  // 防抖处理，避免频繁调用
  const timeoutId = setTimeout(() => {
    autoMatchStandard();
  }, 1000);

  return () => clearTimeout(timeoutId);
}, [
  isEdit,  // ✅ 编辑模式也会触发
  formData.outbound.destination,
  formData.outbound.date,
  formData.inbound.destination,
  formData.inbound.date,
  formData.multiCityRoutes,
  // ...
]);
```

**说明**：
- ✅ 编辑模式（`isEdit`）包含在依赖数组中
- ✅ 当目的地、日期等字段变化时，会自动触发匹配
- ✅ 每次匹配都会调用 API，获取最新标准

### 2. 匹配函数调用 API

**文件**: `frontend/src/pages/Travel/TravelForm.js`

**关键代码**（第 264-278 行）：

```javascript
// 调用标准匹配API，传递所有匹配条件
const matchResponse = await apiClient.post('/travel-standards/match', {
  country: country || '',
  city: cityName || '',
  cityLevel: cityLevel,
  role: role,
  position: position,
  department: department,
  positionLevel: positionLevel,
  projectCode: projectCode,
  matchStrategy: 'MERGE_BEST'
});
```

**说明**：
- ✅ 每次匹配都调用后端 API `/travel-standards/match`
- ✅ 不会使用缓存的标准数据
- ✅ 实时获取最新的标准

### 3. 后端实时查询数据库

**文件**: `backend/controllers/travelStandardController.js`

**关键代码**（第 531-542 行）：

```javascript
// Find all active standards
// 注意：Mongoose 默认不会缓存查询结果，每次查询都会从数据库获取最新数据
const standards = await TravelStandard.find({
  status: 'active',
  effectiveDate: { $lte: now },
  $or: [
    { expiryDate: { $gte: now } },
    { expiryDate: null }
  ]
})
  .populate('expenseStandards.expenseItemId')
  .sort({ priority: -1, effectiveDate: -1 });
```

**说明**：
- ✅ **明确注释**：Mongoose 默认不会缓存查询结果
- ✅ **每次查询都会从数据库获取最新数据**
- ✅ 如果差旅标准被修改，下次匹配时会使用新标准

## 触发时机

编辑未提交的差旅申请时，以下情况会触发重新匹配：

1. **页面加载时**：如果目的地和日期已填写，会自动匹配
2. **修改目的地时**：目的地字段变化会触发匹配
3. **修改日期时**：日期字段变化会触发匹配
4. **修改部门时**：费用承担部门变化会触发匹配（影响匹配条件）
5. **用户信息变化时**：如果用户的角色、岗位、职级变化，会触发匹配

## 实际行为示例

### 场景：修改差旅标准后编辑未提交的申请

1. **初始状态**：
   - 差旅标准 A：住宿标准 500元/天
   - 差旅申请（未提交）：已匹配标准 A，显示 500元/天

2. **修改差旅标准**：
   - 管理员修改标准 A：住宿标准改为 600元/天
   - 保存标准

3. **编辑差旅申请**：
   - 用户打开未提交的申请进行编辑
   - 系统自动触发匹配（因为目的地/日期已存在）
   - 调用 API `/travel-standards/match`
   - 后端查询数据库，获取最新的标准 A（600元/天）
   - 前端更新费用预算，显示 600元/天 ✅

## 结论

✅ **确认：修改差旅标准后，未提交的差旅申请在编辑时会使用新的差旅标准计算费用**

### 原因：
1. 编辑模式支持自动匹配
2. 匹配时实时查询数据库，不使用缓存
3. 每次匹配都获取最新的标准数据

### 注意事项：
- 如果用户已经手动修改了费用预算，自动匹配可能会覆盖手动修改的值
- 匹配有 1 秒防抖，避免频繁调用
- 匹配失败时会静默处理，不影响用户操作

---

**检查时间**: 2025-01-XX  
**检查结果**: ✅ 符合预期  
**无需修改代码**: 当前实现已满足需求

