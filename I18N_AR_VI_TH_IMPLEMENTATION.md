# 多语言支持扩展计划 - 阿拉伯语、越南语、泰语

## 概述
为系统添加阿拉伯语(ar)、越南语(vi)、泰语(th)三种新语言的支持，覆盖所有功能模块。

## 目标语言
- **阿拉伯语 (ar)** - Arabic
- **越南语 (vi)** - Vietnamese  
- **泰语 (th)** - Thai

## 需要翻译的功能模块

### 1. 核心功能
- ✅ 仪表板 (Dashboard)
- ✅ 差旅 (Travel)
- ✅ 费用 (Expenses)
- ✅ PDF 导出
- ✅ 发票夹 (Invoices)
- ✅ 审批 (Approvals)
- ✅ 报告 (Reports)

### 2. 管理功能
- ✅ 差旅标准查询 (Travel Standard Query)
- ✅ 差旅标准管理 (Travel Standard Management)
- ✅ 费用项目维护 (Expense Items Management)
- ✅ 地理位置管理 (Location Management)
- ✅ 国际化监控 (i18n Monitor)
- ✅ 角色管理 (Role Management)
- ✅ 岗位管理 (Position Management)
- ✅ 用户管理 (User Management)
- ✅ 审批流程管理 (Approval Workflows)
- ✅ 审批统计分析 (Approval Statistics)
- ✅ 设置 (Settings)

## 实施步骤

### 阶段 1: 基础设置
1. ✅ 创建语言文件
   - 创建 `frontend/src/i18n/locales/ar.json`
   - 创建 `frontend/src/i18n/locales/vi.json`
   - 创建 `frontend/src/i18n/locales/th.json`
   - 基于英文模板创建初始结构

2. ✅ 注册新语言
   - 在 `frontend/src/i18n/index.js` 中导入新语言文件
   - 添加到 resources 配置
   - 配置回退链

3. ✅ 更新语言选择器
   - 在 `navigation.languages` 中添加新语言选项
   - 更新语言切换组件

### 阶段 2: 核心模块翻译
4. ✅ Common 模块
   - 通用词汇（保存、取消、删除、编辑等）
   - 月份名称
   - 状态文本

5. ✅ Navigation 模块
   - 导航菜单项
   - 页面标题

6. ✅ Dashboard 模块
   - 仪表板相关文本
   - 统计卡片
   - 图表标签

### 阶段 3: 业务模块翻译
7. ✅ Travel 模块
   - 差旅申请表单
   - 差旅列表
   - 差旅详情
   - 差旅标准

8. ✅ Expense 模块
   - 费用申请表单
   - 费用列表
   - 费用详情
   - 费用类别

9. ✅ Invoice 模块
   - 发票夹
   - 发票管理
   - 发票状态

10. ✅ Approval 模块
    - 审批流程
    - 审批列表
    - 审批详情
    - 审批统计分析

11. ✅ Reports 模块
    - 报告页面
    - 图表标签
    - 导出功能

### 阶段 4: 管理模块翻译
12. ✅ Travel Standard 模块
    - 差旅标准查询
    - 差旅标准管理
    - 标准条件设置

13. ✅ Expense Items 模块
    - 费用项目维护
    - 费用项目列表

14. ✅ Location 模块
    - 地理位置管理
    - 位置类型
    - 位置状态

15. ✅ i18n Monitor 模块
    - 国际化监控
    - 翻译缺失统计

16. ✅ Role 模块
    - 角色管理
    - 角色权限

17. ✅ Position 模块
    - 岗位管理
    - 岗位信息

18. ✅ User 模块
    - 用户管理
    - 用户信息
    - 用户状态

19. ✅ Approval Workflows 模块
    - 审批流程管理
    - 流程配置

20. ✅ Settings 模块
    - 设置页面
    - 设置选项

### 阶段 5: 特殊配置
21. ✅ RTL 支持
    - 为阿拉伯语配置从右到左(RTL)文本方向
    - 更新 `localeResolver.js` 中的 `getLocaleDirection` 函数
    - 测试 RTL 布局

22. ✅ 字体支持
    - 为阿拉伯语配置合适的字体（如 Arial, Tahoma）
    - 为越南语配置字体（支持越南语特殊字符）
    - 为泰语配置字体（支持泰语字符）
    - 更新 `localeResolver.js` 中的 `getLocaleFontFamily` 函数

### 阶段 6: 测试与文档
23. ✅ 功能测试
    - 测试所有页面在新语言下的显示
    - 测试语言切换功能
    - 测试 RTL 布局（阿拉伯语）
    - 测试字体渲染

24. ✅ 文档更新
    - 更新 README 中的语言支持说明
    - 记录新增语言的使用方法

## 技术细节

### 文件结构
```
frontend/src/i18n/
├── locales/
│   ├── en.json (现有)
│   ├── zh.json (现有)
│   ├── ja.json (现有)
│   ├── ko.json (现有)
│   ├── ar.json (新增)
│   ├── vi.json (新增)
│   └── th.json (新增)
├── index.js (需要更新)
└── ...
```

### 语言代码
- 阿拉伯语: `ar` (ISO 639-1)
- 越南语: `vi` (ISO 639-1)
- 泰语: `th` (ISO 639-1)

### RTL 支持
阿拉伯语需要特殊的 RTL 支持：
- 设置 `dir="rtl"` 在 HTML 元素上
- 调整 CSS 布局（margin, padding, float 等）
- 测试所有组件的 RTL 显示

### 字体配置
- **阿拉伯语**: `'Arial', 'Tahoma', 'Segoe UI', sans-serif`
- **越南语**: `'Arial', 'Helvetica', sans-serif`
- **泰语**: `'Sarabun', 'Kanit', 'Arial', sans-serif`

## 翻译注意事项

### 阿拉伯语 (ar)
- 从右到左的文本方向
- 数字显示方向（通常从左到右）
- 日期格式可能需要调整
- 某些图标和按钮需要镜像

### 越南语 (vi)
- 支持越南语特殊字符（ă, â, ê, ô, ơ, ư, đ）
- 注意音调符号的正确显示
- 日期格式遵循越南习惯

### 泰语 (th)
- 支持泰语字符集
- 注意泰语的特殊排版规则
- 数字和日期格式

## 优先级
1. **高优先级**: Common, Navigation, Dashboard, Travel, Expense
2. **中优先级**: Approval, Reports, Settings
3. **低优先级**: 管理模块（Role, Position, User 等）

## 预计工作量
- 每个语言文件约 2000+ 翻译键
- 预计每个语言需要 2-3 天完成翻译
- 测试和调整需要 1-2 天
- **总计**: 约 10-12 个工作日

## 完成标准
- ✅ 所有功能模块都有完整翻译
- ✅ 语言切换正常工作
- ✅ RTL 布局正确显示（阿拉伯语）
- ✅ 字体正确渲染
- ✅ 所有页面测试通过
- ✅ 文档已更新

