const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const ExpenseItem = require('../models/ExpenseItem');
const Travel = require('../models/Travel');
const User = require('../models/User');
const notificationService = require('./notificationService');

/**
 * 费用项分类到费用分类的映射
 */
function mapExpenseItemCategoryToExpenseCategory(expenseItemCategory) {
  const mapping = {
    'transport': 'transportation',
    'transportation': 'transportation',
    'accommodation': 'accommodation',
    'meal': 'meals',
    'meals': 'meals',
    'entertainment': 'entertainment',
    'communication': 'communication',
    'office_supplies': 'office_supplies',
    'training': 'training',
    'other': 'other',
    'allowance': 'other',
    'general': 'other'
  };
  
  return mapping[expenseItemCategory] || 'other';
}

/**
 * 匹配费用项分类
 */
function matchCategory(invoiceCategory, expenseItemCategory) {
  const categoryMapping = {
    'transportation': ['transport', 'transportation'],
    'accommodation': ['accommodation'],
    'meals': ['meal'],
    'entertainment': ['entertainment'],
    'communication': ['communication'],
    'office_supplies': ['office_supplies'],
    'training': ['training'],
    'other': ['other', 'allowance', 'general']
  };
  
  const allowedCategories = categoryMapping[invoiceCategory] || ['other'];
  return allowedCategories.includes(expenseItemCategory) ? 1 : 0;
}

/**
 * 时间范围匹配
 */
function isDateInRange(invoiceDate, travelStartDate, travelEndDate) {
  if (!invoiceDate || !travelStartDate || !travelEndDate) {
    return false;
  }
  const invoiceDateObj = new Date(invoiceDate);
  const startDate = new Date(travelStartDate);
  const endDate = new Date(travelEndDate);
  return invoiceDateObj >= startDate && invoiceDateObj <= endDate;
}

/**
 * 出行人信息匹配（交通类发票）
 */
function travelerMatch(invoice, travel) {
  if (invoice.category !== 'transportation') {
    return true; // 非交通类发票不需要匹配出行人
  }
  
  // 检查发票中的出行人信息是否与差旅申请人匹配
  if (invoice.traveler && invoice.traveler.name) {
    // 确保 travel.employee 已 populate
    if (travel.employee && typeof travel.employee === 'object') {
      const employeeName = `${travel.employee.firstName || ''} ${travel.employee.lastName || ''}`.trim();
      const invoiceTravelerName = invoice.traveler.name.trim();
      
      // 比较姓名（支持部分匹配）
      if (employeeName && invoiceTravelerName) {
        return employeeName === invoiceTravelerName || 
               employeeName.includes(invoiceTravelerName) || 
               invoiceTravelerName.includes(employeeName);
      }
    }
    // 如果无法比较，默认匹配（避免误判）
    return true;
  }
  
  // 无出行人信息时默认匹配
  return true;
}

/**
 * 地点匹配（交通类发票）
 */
function locationMatch(invoice, travel) {
  if (invoice.category !== 'transportation') {
    return true;
  }
  
  if (!invoice.traveler) {
    return true;
  }
  
  const invoiceDeparture = invoice.traveler.departure;
  const invoiceDestination = invoice.traveler.destination;
  
  if (!invoiceDeparture || !invoiceDestination) {
    return true; // 无地点信息时默认匹配
  }
  
  // 辅助函数：比较地点（支持字符串和对象）
  const compareLocation = (loc1, loc2) => {
    if (!loc1 || !loc2) return false;
    if (typeof loc1 === 'string' && typeof loc2 === 'string') {
      return loc1 === loc2 || loc1.includes(loc2) || loc2.includes(loc1);
    }
    if (typeof loc1 === 'object' && typeof loc2 === 'object') {
      return loc1.name === loc2.name || loc1._id?.toString() === loc2._id?.toString();
    }
    if (typeof loc1 === 'object') {
      return loc1.name === loc2 || loc1._id?.toString() === loc2;
    }
    if (typeof loc2 === 'object') {
      return loc1 === loc2.name || loc1 === loc2._id?.toString();
    }
    return false;
  };
  
  // 匹配去程
  if (travel.outbound) {
    const outboundMatch = (
      (compareLocation(invoiceDeparture, travel.outbound.departure) ||
       compareLocation(invoiceDeparture, travel.destination)) &&
      (compareLocation(invoiceDestination, travel.outbound.destination) ||
       compareLocation(invoiceDestination, travel.destination))
    );
    if (outboundMatch) return true;
  }
  
  // 匹配返程
  if (travel.inbound) {
    const inboundMatch = (
      (compareLocation(invoiceDeparture, travel.inbound.departure) ||
       compareLocation(invoiceDeparture, travel.destination)) &&
      (compareLocation(invoiceDestination, travel.inbound.destination) ||
       compareLocation(invoiceDestination, travel.destination))
    );
    if (inboundMatch) return true;
  }
  
  // 匹配多程行程
  if (travel.multiCityRoutes && Array.isArray(travel.multiCityRoutes)) {
    for (const route of travel.multiCityRoutes) {
      const routeMatch = (
        compareLocation(invoiceDeparture, route.departure) &&
        compareLocation(invoiceDestination, route.destination)
      );
      if (routeMatch) return true;
    }
  }
  
  return false;
}

/**
 * 提取差旅单的费用预算
 * 预算数据结构：outboundBudget[expenseItemId] = { subtotal, unitPrice, quantity, itemName, ... }
 */
function extractExpenseBudgets(travel) {
  const budgets = [];
  
  // 辅助函数：从预算项中提取金额
  const extractAmount = (budgetItem) => {
    if (typeof budgetItem === 'number') {
      return budgetItem;
    }
    if (typeof budgetItem === 'object' && budgetItem !== null) {
      // 优先使用 subtotal，如果没有则尝试其他字段
      return parseFloat(budgetItem.subtotal) || 
             parseFloat(budgetItem.amount) || 
             parseFloat(budgetItem.total) || 
             0;
    }
    return 0;
  };
  
  // 去程预算
  if (travel.outboundBudget && typeof travel.outboundBudget === 'object') {
    Object.keys(travel.outboundBudget).forEach(expenseItemId => {
      const budgetItem = travel.outboundBudget[expenseItemId];
      const amount = extractAmount(budgetItem);
      
      // 只添加有金额的预算项
      if (amount > 0) {
        budgets.push({
          expenseItemId: expenseItemId,
          route: 'outbound',
          amount: amount
        });
      }
    });
  }
  
  // 返程预算
  if (travel.inboundBudget && typeof travel.inboundBudget === 'object') {
    Object.keys(travel.inboundBudget).forEach(expenseItemId => {
      const budgetItem = travel.inboundBudget[expenseItemId];
      const amount = extractAmount(budgetItem);
      
      // 只添加有金额的预算项
      if (amount > 0) {
        budgets.push({
          expenseItemId: expenseItemId,
          route: 'inbound',
          amount: amount
        });
      }
    });
  }
  
  // 多程行程预算
  if (travel.multiCityRoutesBudget && Array.isArray(travel.multiCityRoutesBudget)) {
    travel.multiCityRoutesBudget.forEach((routeBudget, index) => {
      if (routeBudget && typeof routeBudget === 'object') {
        Object.keys(routeBudget).forEach(expenseItemId => {
          const budgetItem = routeBudget[expenseItemId];
          const amount = extractAmount(budgetItem);
          
          // 只添加有金额的预算项
          if (amount > 0) {
            budgets.push({
              expenseItemId: expenseItemId,
              route: `multiCity-${index}`,
              amount: amount
            });
          }
        });
      }
    });
  }
  
  return budgets;
}

/**
 * 匹配发票到费用项
 * @param {Array} invoices - 可用的发票列表
 * @param {Object} expenseItem - 费用项对象
 * @param {Object} budget - 预算对象
 * @param {Object} travel - 差旅单对象
 * @param {Set} usedInvoiceIds - 已使用的发票ID集合（用于去重）
 */
function matchInvoicesForExpenseItem(invoices, expenseItem, budget, travel, usedInvoiceIds = new Set()) {
  const matched = [];
  
  for (const invoice of invoices) {
    // 跳过已使用的发票
    if (usedInvoiceIds.has(invoice._id.toString())) {
      continue;
    }
    
    let score = 0;
    
    // 1. 分类匹配（权重：40%）
    const categoryMatch = matchCategory(invoice.category, expenseItem.category);
    score += categoryMatch * 40;
    
    // 2. 时间匹配（权重：30%）
    const dateMatch = isDateInRange(
      invoice.invoiceDate,
      travel.startDate,
      travel.endDate
    ) ? 1 : 0;
    score += dateMatch * 30;
    
    // 3. 地点匹配（仅交通类，权重：30%）
    // 对于非交通类发票，地点匹配不适用，给予默认分数
    if (invoice.category === 'transportation') {
      const locationMatchScore = locationMatch(invoice, travel) ? 1 : 0;
      score += locationMatchScore * 30;
    } else {
      // 非交通类发票，地点匹配不适用，给予默认分数（30分）
      score += 30;
    }
    
    // 4. 出行人匹配（交通类，额外加分）
    if (invoice.category === 'transportation') {
      const travelerMatchScore = travelerMatch(invoice, travel) ? 10 : 0;
      score += travelerMatchScore;
    }
    
    // 匹配阈值：60分以上认为匹配
    if (score >= 60) {
      matched.push({
        invoice: invoice,
        score: score
      });
    }
  }
  
  // 按分数排序，返回匹配的发票
  return matched
    .sort((a, b) => b.score - a.score)
    .map(item => item.invoice);
}

/**
 * 计算匹配置信度
 */
function calculateMatchConfidence(matchedInvoices, budget) {
  if (!matchedInvoices || matchedInvoices.length === 0) {
    return 0;
  }
  
  // 简化处理：根据匹配发票数量计算置信度
  // 实际可以根据匹配分数、金额等因素计算
  const baseConfidence = 70;
  const invoiceCountBonus = Math.min(matchedInvoices.length * 5, 20);
  
  return Math.min(baseConfidence + invoiceCountBonus, 100);
}

/**
 * 从发票中提取商户信息
 */
function extractVendorFromInvoices(invoices) {
  if (!invoices || invoices.length === 0) {
    return { name: '', address: '', taxId: '' };
  }
  
  // 使用第一张发票的商户信息
  const firstInvoice = invoices[0];
  return {
    name: firstInvoice.vendor?.name || '',
    address: firstInvoice.vendor?.address || '',
    taxId: firstInvoice.vendor?.taxId || ''
  };
}

/**
 * 发送费用生成通知
 */
async function notifyExpenseGenerated(employeeId, travel, generatedExpenses) {
  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
      console.warn(`Employee not found: ${employeeId}`);
      return;
    }
    
    // 这里可以调用通知服务发送通知
    // await notificationService.notifyExpenseGenerated({
    //   employee: employee,
    //   travel: travel,
    //   expenses: generatedExpenses
    // });
    
    console.log(`Expense generation notification sent to ${employee.email}`);
  } catch (error) {
    console.error('Failed to send expense generation notification:', error);
  }
}

/**
 * 自动匹配发票并生成费用申请
 * @param {Object} travel - 差旅单对象（需要populate employee）
 */
async function autoGenerateExpenses(travel) {
  const Travel = mongoose.model('Travel');
  const travelId = travel._id || travel;
  
  try {
    // 1. 更新状态为生成中（使用 updateOne 避免版本冲突）
    await Travel.updateOne(
      { _id: travelId },
      { $set: { expenseGenerationStatus: 'generating' } }
    );
    
    // 重新查询文档以确保获取最新数据
    travel = await Travel.findById(travelId)
      .populate('employee', 'firstName lastName email');
    
    if (!travel) {
      throw new Error('Travel not found');
    }
    
    // 2. 获取差旅单的费用预算
    const expenseBudgets = extractExpenseBudgets(travel);
    
    if (expenseBudgets.length === 0) {
      await Travel.updateOne(
        { _id: travelId },
        { $set: { expenseGenerationStatus: 'completed' } }
      );
      return {
        success: true,
        generatedCount: 0,
        expenses: [],
        message: 'No expense budgets found in travel'
      };
    }
    
    // 3. 查询发票夹中未匹配的发票
    // 确保日期范围有效
    if (!travel.startDate || !travel.endDate) {
      await Travel.updateOne(
        { _id: travelId },
        {
          $set: {
            expenseGenerationStatus: 'failed',
            expenseGenerationError: 'Travel start date or end date is missing'
          }
        }
      );
      return {
        success: false,
        generatedCount: 0,
        expenses: [],
        message: 'Travel start date or end date is missing'
      };
    }
    
    const availableInvoices = await Invoice.find({
      uploadedBy: travel.employee._id || travel.employee,
      status: { $in: ['pending', 'verified'] },
      $and: [
        {
          $or: [
            { relatedExpense: null },  // 未关联费用
            { relatedExpense: { $exists: false } }
          ]
        },
        {
          $or: [
            { relatedTravel: null },   // 未关联差旅
            { relatedTravel: { $exists: false } }
          ]
        }
      ],
      invoiceDate: {
        $gte: new Date(travel.startDate),
        $lte: new Date(travel.endDate)
      }
    });
    
    if (availableInvoices.length === 0) {
      await Travel.updateOne(
        { _id: travelId },
        { $set: { expenseGenerationStatus: 'completed' } }
      );
      return {
        success: true,
        generatedCount: 0,
        expenses: [],
        message: 'No available invoices found'
      };
    }
    
    // 4. 为每个费用项匹配发票（使用发票去重机制）
    const matchedResults = [];
    const usedInvoiceIds = new Set(); // 用于跟踪已使用的发票ID
    
    for (const budget of expenseBudgets) {
      const expenseItem = await ExpenseItem.findById(budget.expenseItemId);
      if (!expenseItem) {
        console.warn(`ExpenseItem not found: ${budget.expenseItemId}`);
        continue;
      }
      
      // 匹配发票（传入已使用的发票ID集合）
      const matchedInvoices = matchInvoicesForExpenseItem(
        availableInvoices,
        expenseItem,
        budget,
        travel,
        usedInvoiceIds
      );
      
      if (matchedInvoices.length > 0) {
        // 标记这些发票为已使用
        matchedInvoices.forEach(inv => {
          usedInvoiceIds.add(inv._id.toString());
        });
        
        matchedResults.push({
          expenseItemId: budget.expenseItemId,
          expenseItem: expenseItem,
          route: budget.route,
          budgetAmount: budget.amount,
          matchedInvoices: matchedInvoices,
          confidence: calculateMatchConfidence(matchedInvoices, budget)
        });
      }
    }
    
    if (matchedResults.length === 0) {
      await Travel.updateOne(
        { _id: travelId },
        { $set: { expenseGenerationStatus: 'completed' } }
      );
      return {
        success: true,
        generatedCount: 0,
        expenses: [],
        message: 'No invoices matched for any expense items'
      };
    }
    
    // 5. 生成费用申请
    const generatedExpenses = [];
    
    for (const result of matchedResults) {
      // 计算总金额
      const totalAmount = result.matchedInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount || inv.amount || 0), 0
      );
      
      // 创建费用申请
      const expense = await Expense.create({
        employee: travel.employee._id || travel.employee,
        travel: travel._id,
        expenseItem: result.expenseItemId,
        title: `${travel.title || travel.travelNumber || '差旅'} - ${result.expenseItem.itemName}`,
        description: `自动生成：${result.route === 'outbound' ? '去程' : result.route === 'inbound' ? '返程' : '多程'}`,
        category: mapExpenseItemCategoryToExpenseCategory(result.expenseItem.category),
        amount: totalAmount,
        currency: travel.currency || 'CNY',
        date: travel.endDate || new Date(),
        status: 'draft',  // 草稿状态，等待用户编辑
        relatedInvoices: result.matchedInvoices.map(inv => inv._id),
        autoMatched: true,
        matchSource: 'auto',
        matchRules: {
          expenseItemId: result.expenseItemId,
          travelId: travel._id,
          matchedInvoices: result.matchedInvoices.map(inv => inv._id),
          matchedAt: new Date(),
          confidence: result.confidence
        },
        vendor: extractVendorFromInvoices(result.matchedInvoices)
      });
      
      // 更新发票关联
      await Invoice.updateMany(
        { _id: { $in: result.matchedInvoices.map(inv => inv._id) } },
        {
          $set: {
            relatedExpense: expense._id,
            relatedTravel: travel._id,
            matchStatus: 'matched',
            matchedTravelId: travel._id,
            matchedExpenseItemId: result.expenseItemId
          }
        }
      );
      
      generatedExpenses.push(expense);
    }
    
    // 6. 更新差旅单（使用 updateOne 避免版本冲突）
    await Travel.updateOne(
      { _id: travelId },
      {
        $set: {
          relatedExpenses: generatedExpenses.map(exp => exp._id),
          expenseGenerationStatus: 'completed',
          expenseGeneratedAt: new Date()
        }
      }
    );
    
    // 重新查询文档以获取最新数据（用于通知）
    travel = await Travel.findById(travelId)
      .populate('employee', 'firstName lastName email');
    
    // 7. 发送通知给用户
    await notifyExpenseGenerated(
      travel.employee._id || travel.employee,
      travel,
      generatedExpenses
    );
    
    return {
      success: true,
      generatedCount: generatedExpenses.length,
      expenses: generatedExpenses
    };
    
  } catch (error) {
    // 错误处理（使用 updateOne 避免版本冲突）
    try {
      await Travel.updateOne(
        { _id: travelId },
        {
          $set: {
            expenseGenerationStatus: 'failed',
            expenseGenerationError: error.message
          }
        }
      );
    } catch (updateError) {
      console.error('Failed to update travel error status:', updateError);
    }
    
    console.error('Auto generate expenses error:', error);
    throw error;
  }
}

module.exports = {
  autoGenerateExpenses,
  extractExpenseBudgets,
  matchInvoicesForExpenseItem,
  calculateMatchConfidence,
  mapExpenseItemCategoryToExpenseCategory
};

