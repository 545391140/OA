const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 连接数据库
const connectDB = async () => {
  try {
    const config = require('../config');
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables or config');
    }
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    process.exit(1);
  }
};

// 修复实报实销类型的 calcUnit 字段
const fixActualExpenseCalcUnit = async () => {
  await connectDB();

  try {
    const TravelStandard = require('../models/TravelStandard');
    
    console.log('\n' + '='.repeat(60));
    console.log('检查并修复实报实销类型的 calcUnit 字段');
    console.log('='.repeat(60) + '\n');

    // 查询所有标准
    const standards = await TravelStandard.find({});
    
    console.log(`📊 总共找到 ${standards.length} 个差旅标准\n`);

    let totalFixed = 0;
    let totalChecked = 0;

    for (const standard of standards) {
      let needsUpdate = false;
      const updatedExpenseStandards = [];

      if (standard.expenseStandards && standard.expenseStandards.length > 0) {
        standard.expenseStandards.forEach((es, index) => {
          totalChecked++;
          
          // 如果是实报实销类型，但存在 calcUnit 字段，需要清理
          if (es.limitType === 'ACTUAL' && es.calcUnit) {
            console.log(`⚠️  发现问题: 标准 ${standard.standardCode} 的费用项 #${index + 1}`);
            console.log(`   费用项ID: ${es.expenseItemId}`);
            console.log(`   限额类型: ${es.limitType}`);
            console.log(`   当前 calcUnit: ${es.calcUnit} (应该为空)`);
            
            // 创建清理后的对象
            const cleaned = {
              expenseItemId: es.expenseItemId,
              limitType: es.limitType
            };
            
            // 实报实销类型不应该有任何金额相关字段
            // 但保留其他可能需要的字段（如果有的话）
            
            updatedExpenseStandards.push(cleaned);
            needsUpdate = true;
            totalFixed++;
          } else {
            // 其他类型保持不变
            updatedExpenseStandards.push(es);
          }
        });
      }

      // 如果需要更新，执行更新
      if (needsUpdate) {
        try {
          // 使用 $unset 操作符删除实报实销类型的 calcUnit 字段
          const unsetOps = {};
          updatedExpenseStandards.forEach((es, index) => {
            if (es.limitType === 'ACTUAL') {
              unsetOps[`expenseStandards.${index}.calcUnit`] = "";
              unsetOps[`expenseStandards.${index}.limitAmount`] = "";
              unsetOps[`expenseStandards.${index}.limitMin`] = "";
              unsetOps[`expenseStandards.${index}.limitMax`] = "";
              unsetOps[`expenseStandards.${index}.percentage`] = "";
              unsetOps[`expenseStandards.${index}.baseAmount`] = "";
            }
          });
          
          // 先更新数组
          await TravelStandard.findByIdAndUpdate(
            standard._id,
            { $set: { expenseStandards: updatedExpenseStandards } },
            { runValidators: false }
          );
          
          // 然后删除不需要的字段
          if (Object.keys(unsetOps).length > 0) {
            await TravelStandard.findByIdAndUpdate(
              standard._id,
              { $unset: unsetOps },
              { runValidators: false }
            );
          }
          
          console.log(`✅ 已修复标准: ${standard.standardCode}\n`);
        } catch (error) {
          console.error(`❌ 更新标准 ${standard.standardCode} 失败:`, error.message);
          console.error(error.stack);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('修复完成');
    console.log('='.repeat(60));
    console.log(`检查的费用项总数: ${totalChecked}`);
    console.log(`修复的问题数量: ${totalFixed}`);
    console.log('='.repeat(60) + '\n');

    // 验证修复结果（使用 toJSON() 来检查序列化后的数据）
    console.log('验证修复结果...\n');
    const verifyStandards = await TravelStandard.find({});
    let remainingIssues = 0;

    for (const standard of verifyStandards) {
      // 使用 toJSON() 获取转换后的数据
      const standardJSON = standard.toJSON();
      if (standardJSON.expenseStandards && standardJSON.expenseStandards.length > 0) {
        standardJSON.expenseStandards.forEach((es) => {
          if (es.limitType === 'ACTUAL' && es.calcUnit) {
            remainingIssues++;
            console.log(`❌ 仍有问题: 标准 ${standard.standardCode} 的费用项仍有 calcUnit`);
            console.log(`   费用项ID: ${es.expenseItemId}`);
          }
        });
      }
    }

    if (remainingIssues === 0) {
      console.log('✅ 验证通过：所有实报实销类型的费用项都已正确清理 calcUnit 字段\n');
    } else {
      console.log(`⚠️  仍有 ${remainingIssues} 个问题未解决\n`);
      console.log('注意：如果数据库字段已删除，但 Mongoose 默认值仍在应用，');
      console.log('这可能是模型默认值的问题。请检查模型定义中的 calcUnit 默认值。\n');
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
};

fixActualExpenseCalcUnit();

