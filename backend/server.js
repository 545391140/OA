const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const travelRoutes = require('./routes/travel');
const expenseRoutes = require('./routes/expenses');
const approvalRoutes = require('./routes/approvals');
const budgetRoutes = require('./routes/budgets');
const reportRoutes = require('./routes/reports');
const travelStandardRoutes = require('./routes/travelStandards');
const cityLevelRoutes = require('./routes/cityLevels');
const jobLevelRoutes = require('./routes/jobLevels');
const standardMatchRoutes = require('./routes/standardMatch');
const expenseItemRoutes = require('./routes/expenseItems');
const locationRoutes = require('./routes/locations');
const roleRoutes = require('./routes/roles');
const positionRoutes = require('./routes/positions');
const departmentRoutes = require('./routes/departments');
const searchRoutes = require('./routes/search');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const notificationTemplateRoutes = require('./routes/notificationTemplates');
const pushNotificationRoutes = require('./routes/pushNotifications');
const approvalWorkflowRoutes = require('./routes/approvalWorkflows');
const settingsRoutes = require('./routes/settings');
const invoiceRoutes = require('./routes/invoices');

// Connect to database
connectDB();

const app = express();

// 禁用 ETag（避免 304 响应）
app.set('etag', false);

// Security middleware
app.use(helmet({
  crossOriginOpenerPolicy: false, // 禁用 COOP 以支持 HTTP（生产环境建议使用 HTTPS）
  crossOriginEmbedderPolicy: false, // 禁用 COEP 以支持 HTTP
  contentSecurityPolicy: false, // 可根据需要启用
}));

// 移除可能引起警告的响应头（HTTP 环境下）
app.use((req, res, next) => {
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  next();
});
app.use(compression());

// Rate limiting - 增加限制以支持开发环境
// 开发环境使用内存存储，重启后自动清除限制
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' ? 1000 : 500), // 开发环境1000次，生产环境500次
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: (req) => {
    // 排除登录路由，使用专门的登录限制器
    if (req.path === '/api/auth/login') {
      return true;
    }
    return process.env.NODE_ENV === 'test';
  },
  // 使用更精确的 key 生成器，避免所有请求被算作同一个IP
  keyGenerator: (req) => {
    // 使用 IP + 路径作为 key，这样不同路径的请求不会互相影响
    return `${req.ip}-${req.path}`;
  },
  // 开发环境使用内存存储（默认），生产环境可以使用 Redis 等
  store: undefined // 使用默认的内存存储
});

// 为登录路由设置更宽松的限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // 开发环境100次，生产环境20次
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  },
  // 使用内存存储
  store: undefined
});

// 登录路由使用更宽松的限制（必须在通用限制器之前）
app.use('/api/auth/login', loginLimiter);
// 通用 API 速率限制（排除登录路由）
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://localhost:3000',
      `http://localhost:${process.env.PORT || 3001}`,
      // 生产环境可以通过 SERVER_HOST 环境变量配置
      process.env.SERVER_HOST ? `http://${process.env.SERVER_HOST}:${process.env.PORT || 3001}` : null
    ].filter(Boolean); // 移除 undefined 值
    
    // 开发环境允许所有源，生产环境也允许所有源（因为前后端在同一服务器）
    // 如果前后端分离部署，可以通过环境变量 FRONTEND_URL 配置
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin) || !origin) {
      // 允许白名单中的源，或者没有origin（如移动应用）
      callback(null, true);
    } else {
      // 生产环境：前后端在同一服务器，允许所有请求
      callback(null, true);
      // 如果前后端分离，取消上面的注释，启用下面的检查：
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend build path (defined once at top level)
const fs = require('fs');
const frontendBuildPath = path.join(__dirname, '..', 'frontend');
const frontendExists = fs.existsSync(frontendBuildPath);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes (must be before static files to avoid interception)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/travel-standards', travelStandardRoutes);
app.use('/api/city-levels', cityLevelRoutes);
app.use('/api/job-levels', jobLevelRoutes);
app.use('/api/standard-match', standardMatchRoutes);
app.use('/api/expense-items', expenseItemRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/search', searchRoutes);
// Dashboard routes with logging
app.use('/api/dashboard', (req, res, next) => {
  console.log('[SERVER] Dashboard route accessed:', req.method, req.originalUrl);
  console.log('[SERVER] Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  });
  next();
}, dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-templates', notificationTemplateRoutes);
app.use('/api/push', pushNotificationRoutes);
app.use('/api/approval-workflows', approvalWorkflowRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoiceRoutes);

// Serve frontend static files (if deployed together)
if (frontendExists) {
  // IMPORTANT: Handle root path FIRST, before express.static
  // This ensures '/' always returns index.html for React Router
  app.get('/', (req, res) => {
    const indexPath = path.resolve(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`❌ index.html not found at: ${indexPath}`);
      res.status(404).json({ error: 'Frontend index.html not found' });
    }
  });
  
  // Serve static files from frontend build directory
  // express.static will handle /static/* and other assets
  app.use(express.static(path.resolve(frontendBuildPath), {
    index: false,  // Don't auto-serve index.html for '/', we handle it above
    fallthrough: true  // Continue to next middleware if file not found
  }));
  
  console.log(`✅ 前端静态文件服务已启用: ${path.resolve(frontendBuildPath)}`);
  console.log(`    index.html 路径: ${path.resolve(frontendBuildPath, 'index.html')}`);
  console.log(`    index.html 存在: ${fs.existsSync(path.resolve(frontendBuildPath, 'index.html'))}`);
} else {
  console.log(`⚠️  前端目录不存在: ${path.resolve(frontendBuildPath)}`);
}

// Serve frontend for all non-API routes (SPA fallback)
// This must be after API routes but before error handler
// Only set up SPA fallback if frontend exists
if (frontendExists) {
  // SPA fallback: serve index.html for all non-API routes
  // Note: app.get('/') is already defined above, but this catches all other routes
  // IMPORTANT: This must come AFTER app.get('/') to avoid conflicts
  app.get('*', (req, res, next) => {
    // Skip API routes - they should have been handled by API routes above
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ 
        success: false,
        message: 'API endpoint not found' 
      });
    }
    
    // IMPORTANT: Root path should already be handled by app.get('/') above
    // But if for some reason it reaches here, handle it explicitly
    if (req.path === '/' || req.path === '') {
      const indexPath = path.resolve(frontendBuildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    
    // Serve index.html for all other routes (React Router SPA)
    const indexPath = path.resolve(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`❌ SPA fallback: index.html not found at ${indexPath}`);
      next(); // Pass to error handler if file doesn't exist
    }
  });
} else {
  // If frontend doesn't exist, add a catch-all route for debugging
  app.get('*', (req, res) => {
    res.status(404).json({ 
      success: false,
      message: 'Frontend not deployed. Please check deployment.'
    });
  });
}

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
