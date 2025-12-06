const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const ExpenseItem = require('../models/ExpenseItem');
const Travel = require('../models/Travel');
const User = require('../models/User');
const notificationService = require('./notificationService');

/**
 * 生成核销单号
 */
async function generateReimbursementNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `EXP-${year}${month}${day}`;
  
  // 查找今天最大的序号
  const todayExpenses = await Expense.find({
    reimbursementNumber: { $regex: `^${datePrefix}` }
  }).sort({ reimbursementNumber: -1 }).limit(1);
  
  let sequence = 1;
  if (todayExpenses.length > 0 && todayExpenses[0].reimbursementNumber) {
    const lastNumber = todayExpenses[0].reimbursementNumber;
    const parts = lastNumber.split('-');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2] || '0');
      sequence = lastSequence + 1;
    }
  }
  
  // 生成4位序号
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${datePrefix}-${sequenceStr}`;
}

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
      // 注意：subtotal 可能是字符串，需要转换为数字
      const subtotal = typeof budgetItem.subtotal === 'string' 
        ? parseFloat(budgetItem.subtotal) 
        : (budgetItem.subtotal || 0);
      
      if (!isNaN(subtotal) && subtotal > 0) {
        return subtotal;
      }
      
      // 尝试其他字段
      return parseFloat(budgetItem.amount) || 
             parseFloat(budgetItem.total) || 
             (typeof budgetItem.unitPrice === 'string' ? parseFloat(budgetItem.unitPrice) : (budgetItem.unitPrice || 0)) * (budgetItem.quantity || 1) ||
             0;
    }
    return 0;
  };
  
  // 去程预算
  if (travel.outboundBudget && typeof travel.outboundBudget === 'object') {
    Object.keys(travel.outboundBudget).forEach(expenseItemId => {
      const budgetItem = travel.outboundBudget[expenseItemId];
      const amount = extractAmount(budgetItem);
      
      // 添加预算项（包括实报实销类型，因为实际金额可能为0但需要匹配发票）
      if (budgetItem && typeof budgetItem === 'object') {
        budgets.push({
          expenseItemId: expenseItemId,
          route: 'outbound',
          amount: amount,
          // 保存额外的元数据，用于后续处理
          calcUnit: budgetItem.calcUnit || 'PER_DAY',
          limitType: budgetItem.limitType || 'FIXED'
        });
      } else if (amount > 0) {
        // 兼容旧格式：只有金额的情况
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
      
      // 添加预算项（包括实报实销类型，因为实际金额可能为0但需要匹配发票）
      if (budgetItem && typeof budgetItem === 'object') {
        budgets.push({
          expenseItemId: expenseItemId,
          route: 'inbound',
          amount: amount,
          // 保存额外的元数据，用于后续处理
          calcUnit: budgetItem.calcUnit || 'PER_DAY',
          limitType: budgetItem.limitType || 'FIXED'
        });
      } else if (amount > 0) {
        // 兼容旧格式：只有金额的情况
        budgets.push({
          expenseItemId: expenseItemId,
          route: 'inbound',
          amount: amount
        });
      }
    });
  }
  
  // 多程行程预算
  // 确保数组长度与 multiCityRoutes 一致
  if (travel.multiCityRoutesBudget && Array.isArray(travel.multiCityRoutesBudget)) {
    const multiCityRoutesLength = travel.multiCityRoutes && Array.isArray(travel.multiCityRoutes) 
      ? travel.multiCityRoutes.length 
      : travel.multiCityRoutesBudget.length;
    
    travel.multiCityRoutesBudget.forEach((routeBudget, index) => {
      // 只处理有效的索引（确保不超过 multiCityRoutes 的长度）
      if (index >= multiCityRoutesLength) {
        return;
      }
      
      if (routeBudget && typeof routeBudget === 'object') {
        Object.keys(routeBudget).forEach(expenseItemId => {
          const budgetItem = routeBudget[expenseItemId];
          const amount = extractAmount(budgetItem);
          
          // 只添加有金额的预算项（包括实报实销类型，因为实际金额可能为0但需要匹配发票）
          // 注意：实报实销类型的 amount 可能为0，但仍然需要创建费用申请
          if (budgetItem && typeof budgetItem === 'object') {
            budgets.push({
              expenseItemId: expenseItemId,
              route: `multiCity-${index}`,
              amount: amount,
              // 保存额外的元数据，用于后续处理
              calcUnit: budgetItem.calcUnit || 'PER_DAY',
              limitType: budgetItem.limitType || 'FIXED'
            });
          } else if (amount > 0) {
            // 兼容旧格式：只有金额的情况
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
      logger.warn(`Employee not found: ${employeeId}`);
      return;
    }
    
    // 这里可以调用通知服务发送通知
    // await notificationService.notifyExpenseGenerated({
    //   employee: employee,
    //   travel: travel,
    //   expenses: generatedExpenses
    // });
    
    logger.debug(`Expense generation notification sent to ${employee.email}`);
  } catch (error) {
    logger.error('Failed to send expense generation notification:', error);
  }
}

/**
 * 自动匹配发票并生成费用申请
 * @param {Object} travel - 差旅单对象（需要populate employee）
 */
async function autoGenerateExpenses(travel) {
  const Travel = mongoose.model('Travel');
  const travelId = travel._id || travel;
  
  logger.debug(`[EXPENSE_GENERATION] Starting expense generation for travel ${travelId}`);
  
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
    
    logger.debug(`[EXPENSE_GENERATION] Travel found: ${travel.travelNumber || travelId}, employee: ${travel.employee?._id || travel.employee}`);
    
    // 2. 获取差旅单的费用预算
    const expenseBudgets = extractExpenseBudgets(travel);
    logger.debug(`[EXPENSE_GENERATION] Found ${expenseBudgets.length} expense budgets`);
    
    if (expenseBudgets.length === 0) {
      logger.debug(`[EXPENSE_GENERATION] No expense budgets found, marking as completed`);
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
      logger.error(`[EXPENSE_GENERATION] Missing dates: startDate=${travel.startDate}, endDate=${travel.endDate}`);
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
    
    // 安全地获取员工ID
    let employeeId;
    if (travel.employee) {
      if (travel.employee._id) {
        employeeId = travel.employee._id;
      } else if (typeof travel.employee === 'object' && travel.employee.toString) {
        employeeId = travel.employee.toString();
      } else {
        employeeId = travel.employee;
      }
    }
    
    if (!employeeId) {
      throw new Error('Employee ID is missing from travel');
    }
    
    // 验证日期
    const startDate = new Date(travel.startDate);
    const endDate = new Date(travel.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid travel dates');
    }
    
    logger.debug(`[EXPENSE_GENERATION] Querying invoices for employee ${employeeId}, date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // 优化查询条件：查找未关联的发票
    // 条件：1. 属于该员工 2. 状态为pending或verified 3. 未关联费用 4. 未关联差旅 5. 日期在差旅日期范围内
    const queryConditions = {
      uploadedBy: employeeId,
      status: { $in: ['pending', 'verified'] },
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      },
      $and: [
        {
          $or: [
            { relatedExpense: null },
            { relatedExpense: { $exists: false } }
          ]
        },
        {
          $or: [
            { relatedTravel: null },
            { relatedTravel: { $exists: false } }
          ]
        }
      ]
    };
    
    logger.debug(`[EXPENSE_GENERATION] Query conditions:`, JSON.stringify(queryConditions, null, 2));
    
    const availableInvoices = await Invoice.find(queryConditions);
    
    logger.debug(`[EXPENSE_GENERATION] Found ${availableInvoices.length} available invoices`);
    
    if (availableInvoices.length === 0) {
      logger.debug(`[EXPENSE_GENERATION] No available invoices found, marking as completed`);
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
    
    logger.debug(`[EXPENSE_GENERATION] Starting invoice matching for ${expenseBudgets.length} expense budgets`);
    
    for (const budget of expenseBudgets) {
      const expenseItem = await ExpenseItem.findById(budget.expenseItemId);
      if (!expenseItem) {
        logger.warn(`[EXPENSE_GENERATION] ExpenseItem not found: ${budget.expenseItemId}`);
        continue;
      }
      
      logger.debug(`[EXPENSE_GENERATION] Matching invoices for expense item: ${expenseItem.itemName} (${budget.expenseItemId})`);
      
      // 匹配发票（传入已使用的发票ID集合）
      const matchedInvoices = matchInvoicesForExpenseItem(
        availableInvoices,
        expenseItem,
        budget,
        travel,
        usedInvoiceIds
      );
      
      logger.debug(`[EXPENSE_GENERATION] Matched ${matchedInvoices.length} invoices for expense item ${expenseItem.itemName}`);
      
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
    
    logger.debug(`[EXPENSE_GENERATION] Total matched results: ${matchedResults.length}`);
    
    if (matchedResults.length === 0) {
      logger.debug(`[EXPENSE_GENERATION] No invoices matched for any expense items, marking as completed`);
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
    
    logger.debug(`[EXPENSE_GENERATION] Starting expense creation for ${matchedResults.length} matched results`);
    
    for (const result of matchedResults) {
      try {
        logger.debug(`[EXPENSE_GENERATION] Creating expense for expense item: ${result.expenseItemId}`);
        
        // 验证必要数据
        if (!result.expenseItem || !result.expenseItem.itemName) {
          logger.error(`[EXPENSE_GENERATION] Missing expense item data: ${result.expenseItemId}`);
          continue;
        }
        
        if (!result.matchedInvoices || result.matchedInvoices.length === 0) {
          logger.error(`[EXPENSE_GENERATION] No matched invoices for expense item: ${result.expenseItemId}`);
          continue;
        }
        
      // 计算总金额
      // 发票金额提取优先级：totalAmount > amount > items[].amount 之和 > 0
      const totalAmount = result.matchedInvoices.reduce(
          (sum, inv) => {
            // 优先使用 totalAmount（价税合计）
            let amount = parseFloat(inv.totalAmount);
            if (isNaN(amount) || amount <= 0) {
              // 其次使用 amount（金额）
              amount = parseFloat(inv.amount);
            }
            if (isNaN(amount) || amount <= 0) {
              // 如果都没有，尝试从 items 中计算总金额
              if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
                amount = inv.items.reduce((itemSum, item) => {
                  const itemAmount = parseFloat(item.amount) || 
                                   (parseFloat(item.unitPrice) || 0) * (parseFloat(item.quantity) || 1);
                  return itemSum + (isNaN(itemAmount) ? 0 : itemAmount);
                }, 0);
              }
            }
            return sum + (isNaN(amount) || amount <= 0 ? 0 : amount);
          }, 0
      );
        
        // 验证金额有效性
        if (isNaN(totalAmount) || totalAmount <= 0) {
          logger.error('Invalid total amount for expense item:', result.expenseItemId, totalAmount);
          continue;
        }
        
        // 生成核销单号（带重试机制，处理唯一性冲突）
        let reimbursementNumber;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (retryCount < maxRetries) {
          try {
            reimbursementNumber = await generateReimbursementNumber();
            // 检查是否已存在（避免唯一性冲突）
            const existingExpense = await Expense.findOne({ reimbursementNumber });
            if (!existingExpense) {
              break; // 核销单号可用
            }
            retryCount++;
            // 如果已存在，等待一小段时间后重试
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (genError) {
            logger.error('Error generating reimbursement number:', genError);
            retryCount++;
            if (retryCount >= maxRetries) {
              throw new Error('Failed to generate unique reimbursement number after retries');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (!reimbursementNumber) {
          throw new Error('Failed to generate reimbursement number');
        }
        
        // 验证日期
        let expenseDate;
        if (travel.endDate) {
          expenseDate = travel.endDate instanceof Date ? travel.endDate : new Date(travel.endDate);
        } else if (travel.startDate) {
          expenseDate = travel.startDate instanceof Date ? travel.startDate : new Date(travel.startDate);
        } else {
          expenseDate = new Date();
        }
        
        if (!(expenseDate instanceof Date) || isNaN(expenseDate.getTime())) {
          throw new Error('Invalid expense date');
        }
        
        // 安全地获取员工ID和差旅ID
        const expenseEmployeeId = travel.employee?._id || travel.employee || employeeId;
        const expenseTravelId = travel._id || travelId;
        
        if (!expenseEmployeeId) {
          throw new Error('Cannot determine employee ID for expense');
        }
        
        if (!expenseTravelId) {
          throw new Error('Cannot determine travel ID for expense');
        }
      
      // 创建费用申请
      const expense = await Expense.create({
          employee: expenseEmployeeId,
          travel: expenseTravelId,
        expenseItem: result.expenseItemId,
        title: `${travel.title || travel.travelNumber || '差旅'} - ${result.expenseItem.itemName}`,
        description: `自动生成：${result.route === 'outbound' ? '去程' : result.route === 'inbound' ? '返程' : '多程'}`,
          category: mapExpenseItemCategoryToExpenseCategory(result.expenseItem.category || 'other'),
        amount: totalAmount,
        currency: travel.currency || 'CNY',
          date: expenseDate,
        status: 'draft',  // 草稿状态，等待用户编辑
          reimbursementNumber: reimbursementNumber,
          relatedInvoices: result.matchedInvoices.map(inv => inv._id).filter(Boolean),
        autoMatched: true,
        matchSource: 'auto',
        matchRules: {
          expenseItemId: result.expenseItemId,
            travelId: expenseTravelId,
            matchedInvoices: result.matchedInvoices.map(inv => inv._id).filter(Boolean),
          matchedAt: new Date(),
            confidence: result.confidence || 0
        },
        vendor: extractVendorFromInvoices(result.matchedInvoices)
      });
      
      // 更新发票关联
        const invoiceIds = result.matchedInvoices.map(inv => inv._id).filter(Boolean);
        if (invoiceIds.length > 0) {
      await Invoice.updateMany(
            { _id: { $in: invoiceIds } },
        {
          $set: {
            relatedExpense: expense._id,
                relatedTravel: expenseTravelId,
            matchStatus: 'matched',
                matchedTravelId: expenseTravelId,
            matchedExpenseItemId: result.expenseItemId
          }
        }
      );
        }
      
      generatedExpenses.push(expense);
        logger.debug(`[EXPENSE_GENERATION] Successfully created expense ${expense._id} for expense item ${result.expenseItemId}`);
      } catch (expenseError) {
        logger.error(`[EXPENSE_GENERATION] Error creating expense for expense item: ${result.expenseItemId}`, expenseError);
        logger.error(`[EXPENSE_GENERATION] Error details:`, {
          message: expenseError.message,
          name: expenseError.name,
          code: expenseError.code,
          keyPattern: expenseError.keyPattern,
          keyValue: expenseError.keyValue,
          stack: expenseError.stack
        });
        // 继续处理其他费用项，不中断整个流程
        continue;
      }
    }
    
    logger.debug(`[EXPENSE_GENERATION] Successfully created ${generatedExpenses.length} expenses`);
    
    // 6. 更新差旅单（使用 updateOne 避免版本冲突）
    // 只有当成功生成了至少一个费用申请时才更新
    if (generatedExpenses.length > 0) {
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
      try {
        const notifyEmployeeId = travel.employee?._id || travel.employee || employeeId;
        if (notifyEmployeeId) {
    await notifyExpenseGenerated(
            notifyEmployeeId,
      travel,
      generatedExpenses
    );
        } else {
          logger.warn(`[EXPENSE_GENERATION] Cannot send notification: employee ID not found`);
        }
      } catch (notifyError) {
        logger.error(`[EXPENSE_GENERATION] Failed to send notification:`, notifyError);
        // 通知失败不影响主流程
      }
    } else {
      // 如果没有生成任何费用申请，更新状态为完成（但没有费用）
      await Travel.updateOne(
        { _id: travelId },
        {
          $set: {
            expenseGenerationStatus: 'completed',
            expenseGeneratedAt: new Date()
          }
        }
      );
    }
    
    return {
      success: true,
      generatedCount: generatedExpenses.length,
      expenses: generatedExpenses
    };
    
  } catch (error) {
    // 错误处理（使用 updateOne 避免版本冲突）
    logger.error(`[EXPENSE_GENERATION] Fatal error during expense generation for travel ${travelId}:`, error);
    logger.error(`[EXPENSE_GENERATION] Error stack:`, error.stack);
    
    try {
      await Travel.updateOne(
        { _id: travelId },
        {
          $set: {
            expenseGenerationStatus: 'failed',
            expenseGenerationError: error.message || 'Unknown error'
          }
        }
      );
    } catch (updateError) {
      logger.error(`[EXPENSE_GENERATION] Failed to update travel error status:`, updateError);
    }
    
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

