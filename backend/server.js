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

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - 增加限制以支持开发环境
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 500, // limit each IP to 500 requests per windowMs (increased for development)
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in test environment
  skip: (req) => {
    return process.env.NODE_ENV === 'test';
  }
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean); // 移除 undefined 值
    
    // 开发环境允许所有源，生产环境检查白名单
    if (process.env.NODE_ENV === 'development' || !origin) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
