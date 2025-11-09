// 检查所有审批记录的详细状态
const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
console.log('连接到数据库:', mongoURI.replace(/:[^:@]+@/, ':****@'));
mongoose.connect(mongoURI);

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('数据库连接错误:', error);
  process.exit(1);
});

db.once('open', async () => {
  console.log('=== 检查所有审批记录 ===');
  console.log('');

  try {
    const Travel = mongoose.model('Travel', new mongoose.Schema({}, { strict: false }));
    
    // 获取所有有审批记录的差旅申请
    const travels = await Travel.find({
      approvals: { $exists: true, $ne: [] }
    }).lean();
    
    console.log(`找到 ${travels.length} 条有审批记录的差旅申请\n`);
    
    // 统计各种状态
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    
    travels.forEach((travel, index) => {
      console.log(`--- 差旅申请 #${index + 1} ---`);
      console.log('ID:', travel._id);
      console.log('标题:', travel.title || travel.travelNumber || '无标题');
      console.log('整体状态:', travel.status);
      console.log('创建时间:', travel.createdAt);
      console.log('审批记录数:', travel.approvals?.length || 0);
      
      if (travel.approvals && travel.approvals.length > 0) {
        travel.approvals.forEach((approval, idx) => {
          console.log(`  审批 #${idx + 1}:`);
          console.log('    审批人ID:', approval.approver);
          console.log('    级别:', approval.level);
          console.log('    状态:', approval.status);
          console.log('    审批时间:', approval.approvedAt || '未审批');
          console.log('    备注:', approval.comments || '无');
          
          // 统计状态
          if (approval.status === 'pending') pendingCount++;
          else if (approval.status === 'approved') approvedCount++;
          else if (approval.status === 'rejected') rejectedCount++;
        });
      }
      console.log('');
    });
    
    console.log('=== 统计汇总 ===');
    console.log('待审批记录数:', pendingCount);
    console.log('已批准记录数:', approvedCount);
    console.log('已拒绝记录数:', rejectedCount);
    console.log('总审批记录数:', pendingCount + approvedCount + rejectedCount);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
});

