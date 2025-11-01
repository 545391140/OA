const mongoose = require('mongoose');
const ExpenseItem = require('../models/ExpenseItem');
require('dotenv').config();

const initDefaultExpenseItem = async () => {
  try {
    // 连接数据库
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 检查是否已存在"其他费用"
    const existingItem = await ExpenseItem.findOne({ 
      itemName: '其他费用',
      isSystemDefault: true 
    });

    if (!existingItem) {
      // 创建默认的"其他费用"
      const defaultItem = await ExpenseItem.create({
        itemName: '其他费用',
        description: '系统默认费用项，用于管理各类其他费用子项',
        status: 'enabled',
        isSystemDefault: true,
        category: 'general'
      });

      console.log('✅ 默认"其他费用"创建成功:', defaultItem._id);
    } else {
      console.log('ℹ️  "其他费用"已存在，跳过创建');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
};

initDefaultExpenseItem();

