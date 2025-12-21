const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// 连接数据库
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// 查询差旅标准
const checkStandards = async () => {
  await connectDB();

  try {
    // 引入模型 (假设模型路径)
    const TravelStandard = require('../backend/models/TravelStandard');
    
    console.log('\n===== 正在查询差旅标准 =====\n');

    // 查询所有启用的标准
    const standards = await TravelStandard.find({ status: 'active' });
    
    console.log(`找到 ${standards.length} 个已启用的差旅标准`);

    for (const std of standards) {
      console.log(`\n--------------------------------------------------`);
      console.log(`标准名称: ${std.standardName}`);
      console.log(`标准编码: ${std.standardCode}`);
      console.log(`优先级: ${std.priority}`);
      
      console.log('\n--- 适用条件 ---');
      if (std.conditions && std.conditions.length > 0) {
        std.conditions.forEach((group, gIdx) => {
          console.log(`  条件组 ${gIdx + 1}:`);
          group.conditions.forEach((cond, cIdx) => {
            console.log(`    ${cIdx + 1}. ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
          });
        });
      } else {
        console.log('  (无适用条件)');
      }

      console.log('\n--- 费用标准 ---');
      // 这里需要根据实际模型结构调整，假设有 expenseStandards 关联或内嵌
      // 如果是关联表，可能需要额外查询
      
      // 尝试查询关联的费用标准项
      const TransportStandard = require('../backend/models/TravelTransportStandard');
      const AccommodationStandard = require('../backend/models/TravelAccommodationStandard');
      const AllowanceStandard = require('../backend/models/TravelAllowanceStandard');
      const OtherStandard = require('../backend/models/TravelOtherExpenseStandard');

      const transports = await TransportStandard.find({ standard: std._id });
      if (transports.length > 0) {
        console.log('  [交通费用]');
        transports.forEach(item => {
          console.log(`    - ${item.transportType}: 限额 ${item.limitAmount} (计算单位: ${item.calcUnit}, 类型: ${item.limitType})`);
        });
      }

      const accommodations = await AccommodationStandard.find({ standard: std._id });
      if (accommodations.length > 0) {
        console.log('  [住宿费用]');
        accommodations.forEach(item => {
          console.log(`    - 城市等级 ${item.cityLevel || '所有'}: 限额 ${item.limitAmount} (计算单位: ${item.calcUnit}, 类型: ${item.limitType})`);
        });
      }
      
      const allowances = await AllowanceStandard.find({ standard: std._id });
      if (allowances.length > 0) {
        console.log('  [津贴补助]');
        allowances.forEach(item => {
          console.log(`    - ${item.allowanceType}: 金额 ${item.amount} (计算方式: ${item.amountType})`);
        });
      }
      
      const others = await OtherStandard.find({ standard: std._id });
      if (others.length > 0) {
        console.log('  [其他费用]');
        others.forEach(item => {
          console.log(`    - ${item.expenseTypeName}: 金额 ${item.amount} (计算方式: ${item.amountType})`);
        });
      }
    }

    console.log('\n===== 查询结束 =====\n');

  } catch (error) {
    console.error('查询出错:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

checkStandards();









