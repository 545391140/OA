// Environment Configuration
// ⚠️ 生产环境必须通过环境变量设置所有敏感信息
// 请复制 .env.example 为 .env 并填入真实值

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  // 生产环境必须设置 MONGODB_URI 环境变量
  MONGODB_URI: process.env.MONGODB_URI || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ MONGODB_URI environment variable is required in production');
    }
    // 开发环境默认使用本地数据库
    return 'mongodb://localhost:27017/travel-expense-dev';
  })(),

  // JWT Secret
  // 生产环境必须设置强密钥（至少32字符）
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ JWT_SECRET environment variable is required in production');
    }
    return 'dev-jwt-secret-key-for-development-only';
  })(),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'your-email@gmail.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'your-app-password',

  // File Upload
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 10485760, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,

  // Mistral AI Configuration (Optional)
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
  
  // Alibaba Cloud DashScope Configuration (Optional)
  DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY || '',
  
  // 携程商旅API配置
  // 生产环境必须设置环境变量
  CTRIP_APP_KEY: process.env.CTRIP_APP_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ CTRIP_APP_KEY environment variable is required in production');
    }
    return 'dev-app-key-placeholder';
  })(),
  CTRIP_APP_SECURITY: process.env.CTRIP_APP_SECURITY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ CTRIP_APP_SECURITY environment variable is required in production');
    }
    return 'dev-security-placeholder';
  })(),

  // Amadeus API配置
  // 生产环境必须设置环境变量
  AMADEUS_API_KEY: process.env.AMADEUS_API_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ AMADEUS_API_KEY environment variable is required in production');
    }
    // 开发环境可以使用测试密钥
    return process.env.AMADEUS_API_KEY || '';
  })(),
  AMADEUS_API_SECRET: process.env.AMADEUS_API_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ AMADEUS_API_SECRET environment variable is required in production');
    }
    // 开发环境可以使用测试密钥
    return process.env.AMADEUS_API_SECRET || '';
  })(),
  AMADEUS_API_ENV: process.env.AMADEUS_API_ENV || 'test' // test 或 production
};
