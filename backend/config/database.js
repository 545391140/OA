const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    // 检查是否设置了跳过数据库连接的标志
    if (process.env.SKIP_DB === 'true') {
      console.log('⚠️  Skipping database connection (SKIP_DB=true)');
      return;
    }

    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log(`🔌 Attempting to connect to MongoDB...`);
    
    // 优化连接配置，解决副本集选举导致的拓扑信息过时问题
    const conn = await mongoose.connect(mongoUri, {
      // 服务器选择超时时间（毫秒），默认30秒，设置为10秒
      serverSelectionTimeoutMS: 10000,
      // 套接字超时时间（毫秒），默认0（无超时），设置为30秒
      socketTimeoutMS: 30000,
      // 连接超时时间（毫秒），默认30秒
      connectTimeoutMS: 30000,
      // 最大连接池大小，默认100
      maxPoolSize: 10,
      // 最小连接池大小，默认0
      minPoolSize: 2,
      // 连接最大空闲时间（毫秒），超过此时间未使用的连接将被关闭
      maxIdleTimeMS: 30000,
      // 启用读取重试（当读取操作失败时自动重试）
      retryReads: true,
      // 启用写入重试（当写入操作失败时自动重试）
      retryWrites: true,
      // 读取偏好：优先从主节点读取，但允许从次节点读取（提高可用性）
      readPreference: 'primaryPreferred',
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    
    // 监听连接事件，处理拓扑变化
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      // 如果是拓扑选择错误，记录详细信息
      if (err.name === 'MongoServerSelectionError') {
        console.error('⚠️  MongoDB topology selection error - this may be due to replica set election');
        console.error('   建议：等待几秒后重试，或重启服务以刷新拓扑信息');
      }
    });

    // 监听断开连接事件
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    // 监听重新连接事件
    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
    });

    // 监听拓扑变化事件（副本集选举等）
    mongoose.connection.on('topologyDescriptionChanged', (event) => {
      console.log('📡 MongoDB topology changed:', {
        type: event.newDescription?.type,
        servers: event.newDescription?.servers?.length || 0,
      });
    });

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('❌ Full error:', error);
    console.log('⚠️  Continuing without database connection...');
    // 不退出进程，继续运行
  }
};

module.exports = connectDB;
