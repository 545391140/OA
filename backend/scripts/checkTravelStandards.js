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

// 查询差旅标准
const checkStandards = async () => {
  await connectDB();

  try {
    const TravelStandard = require('../models/TravelStandard');
    const ExpenseItem = require('../models/ExpenseItem');
    const Location = require('../models/Location');
    
    console.log('\n' + '='.repeat(60));
    console.log('正在查询差旅标准');
    console.log('='.repeat(60) + '\n');

    // 查询所有标准（包括草稿、激活、过期）
    const allStandards = await TravelStandard.find({})
      .populate('expenseStandards.expenseItemId', 'itemName category')
      .sort({ priority: -1, effectiveDate: -1, createdAt: -1 });
    
    console.log(`📊 总共找到 ${allStandards.length} 个差旅标准\n`);

    // 按状态分组统计
    const statusCounts = {
      active: allStandards.filter(s => s.status === 'active').length,
      draft: allStandards.filter(s => s.status === 'draft').length,
      expired: allStandards.filter(s => s.status === 'expired').length
    };
    
    console.log('📈 状态统计:');
    console.log(`  激活: ${statusCounts.active}`);
    console.log(`  草稿: ${statusCounts.draft}`);
    console.log(`  过期: ${statusCounts.expired}\n`);

    // 显示每个标准的详细信息
    for (let i = 0; i < allStandards.length; i++) {
      const std = allStandards[i];
      
      console.log('\n' + '-'.repeat(60));
      console.log(`标准 #${i + 1}`);
      console.log('-'.repeat(60));
      console.log(`标准名称: ${std.standardName}`);
      console.log(`标准编码: ${std.standardCode}`);
      console.log(`状态: ${std.status} ${std.status === 'active' ? '✅' : std.status === 'draft' ? '📝' : '❌'}`);
      console.log(`优先级: ${std.priority}`);
      console.log(`版本: ${std.version}`);
      
      if (std.description) {
        console.log(`描述: ${std.description}`);
      }
      
      console.log(`生效日期: ${std.effectiveDate ? std.effectiveDate.toLocaleDateString('zh-CN') : '未设置'}`);
      console.log(`失效日期: ${std.expiryDate ? std.expiryDate.toLocaleDateString('zh-CN') : '无限制'}`);
      
      // 检查是否在有效期内
      const now = new Date();
      const isEffective = std.effectiveDate && std.effectiveDate <= now;
      const isExpired = std.expiryDate && std.expiryDate < now;
      const isInPeriod = isEffective && !isExpired;
      
      if (std.status === 'active') {
        if (!isInPeriod) {
          console.log(`⚠️  警告: 标准状态为激活，但不在有效期内`);
        }
      }

      // 适用条件组
      console.log('\n--- 适用条件 ---');
      if (std.conditionGroups && std.conditionGroups.length > 0) {
        std.conditionGroups.forEach((group, gIdx) => {
          console.log(`  条件组 ${gIdx + 1} (组内逻辑: ${group.logicOperator || 'AND'}):`);
          if (group.conditions && group.conditions.length > 0) {
            group.conditions.forEach((cond, cIdx) => {
              const locationInfo = cond.locationIds && cond.locationIds.length > 0 
                ? ` [Location IDs: ${cond.locationIds.map(id => id.toString()).join(', ')}]`
                : '';
              console.log(`    ${cIdx + 1}. ${cond.type} ${cond.operator} ${cond.value}${locationInfo}`);
            });
          } else {
            console.log(`    (无条件)`);
          }
        });
        console.log(`  (条件组之间是OR关系，组内条件是AND关系)`);
      } else {
        console.log('  (无适用条件 - 适用于所有情况)');
      }

      // 费用标准（使用 toJSON() 转换后的数据，确保实报实销类型不显示 calcUnit）
      console.log('\n--- 费用标准配置 ---');
      const stdJSON = std.toJSON();
      if (stdJSON.expenseStandards && stdJSON.expenseStandards.length > 0) {
        console.log(`  配置了 ${stdJSON.expenseStandards.length} 个费用项:\n`);
        
        stdJSON.expenseStandards.forEach((es, idx) => {
          const itemId = es.expenseItemId?._id?.toString() || es.expenseItemId?.toString();
          const itemName = es.expenseItemId?.itemName || '未知费用项';
          const category = es.expenseItemId?.category || '未知分类';
          
          console.log(`  ${idx + 1}. ${itemName} (${category})`);
          console.log(`     费用项ID: ${itemId}`);
          console.log(`     限额类型: ${es.limitType}`);
          
          if (es.limitType === 'FIXED') {
            console.log(`     限额金额: ${es.limitAmount || 0} CNY`);
            if (es.calcUnit) {
              console.log(`     计算单位: ${es.calcUnit} (${es.calcUnit === 'PER_DAY' ? '元/天' : es.calcUnit === 'PER_TRIP' ? '元/次' : '元/公里'})`);
            } else {
              console.log(`     计算单位: 未设置`);
            }
          } else if (es.limitType === 'RANGE') {
            console.log(`     限额范围: ${es.limitMin || 0} ~ ${es.limitMax || 0} CNY`);
          } else if (es.limitType === 'PERCENTAGE') {
            console.log(`     比例: ${es.percentage || 0}%`);
            console.log(`     基准金额: ${es.baseAmount || 0} CNY`);
          } else if (es.limitType === 'ACTUAL') {
            console.log(`     实报实销`);
            if (es.calcUnit) {
              console.log(`     ⚠️  警告: 实报实销类型不应有 calcUnit 字段，当前值为: ${es.calcUnit}`);
            }
          }
          console.log('');
        });
      } else {
        console.log('  (未配置费用标准)');
      }

      // 费用项配置标识
      if (std.expenseItemsConfigured && Object.keys(std.expenseItemsConfigured).length > 0) {
        const configuredCount = Object.values(std.expenseItemsConfigured).filter(v => v === true).length;
        const totalCount = Object.keys(std.expenseItemsConfigured).length;
        console.log(`\n--- 费用项配置状态 ---`);
        console.log(`  已配置: ${configuredCount}/${totalCount}`);
      }

      // 创建和更新信息
      if (std.createdAt) {
        console.log(`\n创建时间: ${std.createdAt.toLocaleString('zh-CN')}`);
      }
      if (std.updatedAt) {
        console.log(`更新时间: ${std.updatedAt.toLocaleString('zh-CN')}`);
      }
    }

    // 检查潜在问题
    console.log('\n' + '='.repeat(60));
    console.log('问题检查');
    console.log('='.repeat(60));
    
    const issues = [];
    
    // 检查是否有多个激活的标准
    const activeStandards = allStandards.filter(s => s.status === 'active');
    if (activeStandards.length > 1) {
      console.log(`⚠️  发现 ${activeStandards.length} 个激活的标准，可能存在优先级冲突`);
      activeStandards.forEach(s => {
        console.log(`   - ${s.standardCode} (优先级: ${s.priority})`);
      });
    }
    
    // 检查是否有标准没有配置费用项
    const standardsWithoutExpenses = allStandards.filter(s => 
      !s.expenseStandards || s.expenseStandards.length === 0
    );
    if (standardsWithoutExpenses.length > 0) {
      console.log(`\n⚠️  发现 ${standardsWithoutExpenses.length} 个标准未配置费用项:`);
      standardsWithoutExpenses.forEach(s => {
        console.log(`   - ${s.standardCode} (${s.standardName})`);
      });
    }
    
    // 检查是否有标准没有适用条件
    const standardsWithoutConditions = allStandards.filter(s => 
      !s.conditionGroups || s.conditionGroups.length === 0
    );
    if (standardsWithoutConditions.length > 0) {
      console.log(`\n⚠️  发现 ${standardsWithoutConditions.length} 个标准未设置适用条件 (将匹配所有情况):`);
      standardsWithoutConditions.forEach(s => {
        console.log(`   - ${s.standardCode} (${s.standardName})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('查询完成');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 查询出错:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
};

checkStandards();

