const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 检查是否设置了跳过数据库连接的标志
    if (process.env.SKIP_DB === 'true') {
      console.log('⚠️  Skipping database connection (SKIP_DB=true)');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system');

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('⚠️  Continuing without database connection...');
    // 不退出进程，继续运行
  }
};

module.exports = connectDB;
