# 差旅和费用管理系统 (Travel & Expense Management System)

一个现代化的、支持国际化的差旅和费用管理系统，参考SAP Concur的功能设计，提供完整的差旅申请、费用报销、审批流程和报告分析功能。

## 🌟 主要特性

### 核心功能
- **差旅管理**: 差旅申请、预订管理、行程跟踪
- **费用管理**: 费用报销、发票管理、自动分类
- **审批流程**: 多级审批、智能路由、状态跟踪
- **预算管理**: 预算设置、成本控制、预警机制
- **报告分析**: 实时分析、趋势预测、多维度报表

### 技术特性
- **现代化UI**: 基于Material-UI的精美界面设计
- **国际化支持**: 支持中文、英文、日文、韩文
- **响应式设计**: 完美支持桌面端和移动端
- **实时通知**: 智能消息推送和状态提醒
- **安全认证**: JWT认证、权限控制、数据加密

## 🏗️ 技术架构

### 前端技术栈
- **React 18**: 现代化的用户界面框架
- **Material-UI**: 企业级UI组件库
- **React Router**: 单页应用路由管理
- **i18next**: 国际化解决方案
- **Recharts**: 数据可视化图表库
- **Axios**: HTTP客户端

### 后端技术栈
- **Node.js**: 服务器运行环境
- **Express.js**: Web应用框架
- **MongoDB**: NoSQL数据库
- **Mongoose**: MongoDB对象建模
- **JWT**: 身份认证
- **Multer**: 文件上传处理

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- MongoDB 4.4+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd travel-expense-system
```

2. **安装依赖**
```bash
# 安装所有依赖（前端+后端）
npm run install:all

# 或者分别安装
npm install
cd frontend && npm install
cd ../backend && npm install
```

3. **环境配置**
```bash
# 复制后端环境配置示例
cp backend/config.example.js backend/config.js

# 编辑配置文件，设置数据库连接等
```

4. **启动开发服务器**
```bash
# 同时启动前端和后端
npm run dev

# 或者分别启动
npm run dev:frontend  # 前端: http://localhost:3000
npm run dev:backend   # 后端: http://localhost:3001
```

5. **访问应用**
- 前端应用: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

## 📱 功能模块

### 1. 用户认证
- 用户注册/登录
- 密码管理
- 权限控制
- 个人资料管理

### 2. 差旅管理
- 差旅申请提交
- 在线预订集成
- 行程跟踪
- 费用预估

### 3. 费用管理
- 费用录入
- 发票上传
- OCR识别
- 自动分类

### 4. 审批流程
- 多级审批
- 智能路由
- 状态跟踪
- 消息通知

### 5. 报告分析
- 实时仪表板
- 费用分析
- 预算报告
- 数据导出

## 🌍 国际化支持

系统支持多种语言：
- 🇺🇸 English
- 🇨🇳 中文
- 🇯🇵 日本語
- 🇰🇷 한국어

用户可以在设置中切换语言，系统会记住用户的语言偏好。

## 📊 数据模型

### 用户模型 (User)
- 基本信息：姓名、邮箱、部门、职位
- 权限管理：角色、权限级别
- 偏好设置：语言、货币、时区

### 差旅模型 (Travel)
- 申请信息：目的、目的地、时间
- 预订信息：机票、酒店、租车
- 审批流程：多级审批、状态跟踪

### 费用模型 (Expense)
- 费用信息：类别、金额、日期
- 发票管理：上传、识别、验证
- 项目关联：成本中心、客户

## 🔧 开发指南

### 项目结构
```
travel-expense-system/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   ├── pages/          # 页面组件
│   │   ├── contexts/       # React Context
│   │   ├── i18n/          # 国际化配置
│   │   └── utils/         # 工具函数
│   └── public/            # 静态资源
├── backend/                # Node.js后端API
│   ├── models/            # 数据模型
│   ├── routes/            # API路由
│   ├── middleware/        # 中间件
│   └── config/           # 配置文件
└── docs/                 # 项目文档
```

### 代码规范
- 使用ESLint进行代码检查
- 遵循Airbnb JavaScript规范
- 组件使用函数式组件和Hooks
- API使用RESTful设计原则

### 测试
```bash
# 运行前端测试
cd frontend && npm test

# 运行后端测试
cd backend && npm test
```

## 🚀 部署指南

### 生产环境部署
1. **构建前端**
```bash
cd frontend && npm run build
```

2. **配置环境变量**
```bash
# 设置生产环境变量
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
```

3. **启动服务**
```bash
cd backend && npm start
```

### Docker部署
```bash
# 构建镜像
docker build -t travel-expense-system .

# 运行容器
docker run -p 3000:3000 -p 3001:3001 travel-expense-system
```

## 📈 性能优化

- **前端优化**: 代码分割、懒加载、缓存策略
- **后端优化**: 数据库索引、查询优化、缓存机制
- **网络优化**: 请求合并、数据压缩、CDN加速

## 🔒 安全特性

- **身份认证**: JWT令牌、密码加密
- **权限控制**: 基于角色的访问控制
- **数据保护**: 输入验证、SQL注入防护
- **文件安全**: 文件类型验证、大小限制

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您有任何问题或建议，请：
- 提交Issue
- 发送邮件至 support@example.com
- 查看文档: [项目文档](docs/)

## 🎯 路线图

### v1.1 (计划中)
- [ ] 移动端App
- [ ] 高级分析功能
- [ ] 第三方集成
- [ ] 工作流引擎

### v1.2 (未来)
- [ ] AI智能推荐
- [ ] 区块链发票验证
- [ ] 语音输入支持
- [ ] 增强现实功能

---

**注意**: 这是一个演示项目，用于展示现代差旅和费用管理系统的设计和实现。在生产环境中使用前，请确保进行充分的安全测试和性能优化。
