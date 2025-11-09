// 检查数据库中的审批数据
const mongoose = require('mongoose');
const config = require('./backend/config');

// 连接数据库
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('数据库连接错误:', error);
  process.exit(1);
});

db.once('open', async () => {
  console.log('=== 检查审批数据 ===');
  console.log('');

  try {
    // 检查Travel集合
    const Travel = mongoose.model('Travel', new mongoose.Schema({}, { strict: false }));
    const travelCount = await Travel.countDocuments();
    console.log(`差旅申请总数: ${travelCount}`);
    
    const travelWithApprovals = await Travel.countDocuments({
      approvals: { $exists: true, $ne: [] }
    });
    console.log(`有审批记录的差旅申请数: ${travelWithApprovals}`);
    
    if (travelWithApprovals > 0) {
      const sampleTravel = await Travel.findOne({
        approvals: { $exists: true, $ne: [] }
      }).lean();
      console.log('\n示例差旅申请:');
      console.log('- ID:', sampleTravel._id);
      console.log('- 创建时间:', sampleTravel.createdAt);
      console.log('- 审批记录数:', sampleTravel.approvals?.length || 0);
      if (sampleTravel.approvals && sampleTravel.approvals.length > 0) {
        console.log('- 第一个审批记录:', JSON.stringify(sampleTravel.approvals[0], null, 2));
      }
      
      // 查询日期范围
      const dateRange = await Travel.aggregate([
        {
          $match: {
            approvals: { $exists: true, $ne: [] }
          }
        },
        {
          $group: {
            _id: null,
            minDate: { $min: '$createdAt' },
            maxDate: { $max: '$createdAt' }
          }
        }
      ]);
      
      if (dateRange.length > 0) {
        console.log('\n差旅申请日期范围:');
        console.log('- 最早:', dateRange[0].minDate);
        console.log('- 最晚:', dateRange[0].maxDate);
      }
    }
    
    console.log('');
    console.log('---');
    console.log('');
    
    // 检查Expense集合
    const Expense = mongoose.model('Expense', new mongoose.Schema({}, { strict: false }));
    const expenseCount = await Expense.countDocuments();
    console.log(`费用申请总数: ${expenseCount}`);
    
    const expenseWithApprovals = await Expense.countDocuments({
      approvals: { $exists: true, $ne: [] }
    });
    console.log(`有审批记录的费用申请数: ${expenseWithApprovals}`);
    
    if (expenseWithApprovals > 0) {
      const sampleExpense = await Expense.findOne({
        approvals: { $exists: true, $ne: [] }
      }).lean();
      console.log('\n示例费用申请:');
      console.log('- ID:', sampleExpense._id);
      console.log('- 创建时间:', sampleExpense.createdAt);
      console.log('- 审批记录数:', sampleExpense.approvals?.length || 0);
      if (sampleExpense.approvals && sampleExpense.approvals.length > 0) {
        console.log('- 第一个审批记录:', JSON.stringify(sampleExpense.approvals[0], null, 2));
      }
      
      // 查询日期范围
      const dateRange = await Expense.aggregate([
        {
          $match: {
            approvals: { $exists: true, $ne: [] }
          }
        },
        {
          $group: {
            _id: null,
            minDate: { $min: '$createdAt' },
            maxDate: { $max: '$createdAt' }
          }
        }
      ]);
      
      if (dateRange.length > 0) {
        console.log('\n费用申请日期范围:');
        console.log('- 最早:', dateRange[0].minDate);
        console.log('- 最晚:', dateRange[0].maxDate);
      }
    }
    
    console.log('');
    console.log('=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
});

