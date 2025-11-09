const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get pending approvals
// @route   GET /api/approvals
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get travel requests pending approval
    const pendingTravels = await Travel.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email');

    // Get expenses pending approval
    const pendingExpenses = await Expense.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination');

    res.json({
      success: true,
      data: {
        travels: pendingTravels,
        expenses: pendingExpenses
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject travel request
// @route   PUT /api/approvals/travel/:id
// @access  Private
router.put('/travel/:id', protect, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const notificationService = require('../services/notificationService');

    const travel = await Travel.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // Update approval status
    const approvalIndex = travel.approvals.findIndex(
      approval => approval.approver.toString() === req.user.id
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this request'
      });
    }

    // 检查审批级别顺序（可选）
    const currentLevel = travel.approvals[approvalIndex].level;
    const hasLowerLevelPending = travel.approvals.some(
      approval => approval.level < currentLevel && approval.status === 'pending'
    );

    if (hasLowerLevelPending) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve: lower level approvals are still pending'
      });
    }

    travel.approvals[approvalIndex].status = status;
    travel.approvals[approvalIndex].comments = comments;
    travel.approvals[approvalIndex].approvedAt = new Date();

    // Update overall status if all approvals are complete
    const allApproved = travel.approvals.every(approval => approval.status === 'approved');
    const anyRejected = travel.approvals.some(approval => approval.status === 'rejected');

    if (anyRejected) {
      travel.status = 'rejected';
    } else if (allApproved) {
      travel.status = 'approved';
    }

    await travel.save();

    // 发送通知给申请人
    try {
      if (status === 'approved') {
        await notificationService.notifyApprovalApproved({
          requester: travel.employee._id,
          requestType: 'travel',
          requestId: travel._id,
          requestTitle: travel.title || travel.travelNumber,
          approver: req.user.id
        });
      } else if (status === 'rejected') {
        await notificationService.notifyApprovalRejected({
          requester: travel.employee._id,
          requestType: 'travel',
          requestId: travel._id,
          requestTitle: travel.title || travel.travelNumber,
          approver: req.user.id,
          comments
        });
      }
    } catch (notifyError) {
      console.error('Failed to send approval notification:', notifyError);
      // 通知失败不影响审批流程
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    console.error('Update travel approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject expense
// @route   PUT /api/approvals/expense/:id
// @access  Private
router.put('/expense/:id', protect, async (req, res) => {
  try {
    const { status, comments } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update approval status
    const approvalIndex = expense.approvals.findIndex(
      approval => approval.approver.toString() === req.user.id
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this request'
      });
    }

    expense.approvals[approvalIndex].status = status;
    expense.approvals[approvalIndex].comments = comments;
    expense.approvals[approvalIndex].approvedAt = new Date();

    // Update overall status if all approvals are complete
    const allApproved = expense.approvals.every(approval => approval.status === 'approved');
    const anyRejected = expense.approvals.some(approval => approval.status === 'rejected');

    if (anyRejected) {
      expense.status = 'rejected';
    } else if (allApproved) {
      expense.status = 'approved';
    }

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Update expense approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get approval history
// @route   GET /api/approvals/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const travelQuery = {
      'approvals.approver': req.user.id,
      'approvals.status': { $in: ['approved', 'rejected'] }
    };
    const expenseQuery = {
      'approvals.approver': req.user.id,
      'approvals.status': { $in: ['approved', 'rejected'] }
    };

    if (status) {
      travelQuery.status = status;
      expenseQuery.status = status;
    }

    let travels = [];
    let expenses = [];

    if (!type || type === 'travel') {
      travels = await Travel.find(travelQuery)
        .populate('employee', 'firstName lastName email')
        .populate('approvals.approver', 'firstName lastName email')
        .sort({ 'approvals.approvedAt': -1 })
        .skip(skip)
        .limit(limit);
    }

    if (!type || type === 'expense') {
      expenses = await Expense.find(expenseQuery)
        .populate('employee', 'firstName lastName email')
        .populate('travel', 'title destination')
        .sort({ 'approvals.approvedAt': -1 })
        .skip(skip)
        .limit(limit);
    }

    const total = travels.length + expenses.length;

    res.json({
      success: true,
      data: {
        travels,
        expenses
      },
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get approval statistics
// @route   GET /api/approvals/statistics
// @access  Private
router.get('/statistics', protect, async (req, res) => {
  console.log('=== Approval Statistics API Called ===');
  console.log('Request user:', req.user);
  console.log('Query params:', req.query);
  
  try {
    const { startDate, endDate, type } = req.query;
    console.log('Parsed params:', { startDate, endDate, type });

    // 构建日期查询
    // 注意：结束日期应该包含当天的23:59:59.999，而不是00:00:00
    const dateQuery = {};
    if (startDate) {
      // 开始日期：设置为当天的00:00:00.000
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateQuery.$gte = start;
    }
    if (endDate) {
      // 结束日期：设置为当天的23:59:59.999，以包含整天的数据
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }

    // 构建基础匹配条件
    // 确保req.user.id正确转换为ObjectId
    // 注意：MongoDB查询数组字段时，ObjectId和字符串可能不匹配
    // 我们需要同时尝试ObjectId和字符串格式
    let approverId;
    let approverIdString;
    try {
      if (mongoose.Types.ObjectId.isValid(req.user.id)) {
        approverId = mongoose.Types.ObjectId(req.user.id);
        approverIdString = String(req.user.id);
      } else {
        approverId = req.user.id;
        approverIdString = String(req.user.id);
      }
    } catch (error) {
      approverId = req.user.id;
      approverIdString = String(req.user.id);
    }
    
    console.log('Approver ID (ObjectId):', approverId);
    console.log('Approver ID (String):', approverIdString);
    
    // 构建匹配条件
    // 注意：approvals数组中没有createdAt字段，只有approvedAt
    // 日期查询应该使用文档级别的createdAt（文档创建时间）
    // 使用$in来匹配ObjectId或字符串格式
    // 注意：日期查询应该在聚合查询的$match阶段分别处理，而不是在基础查询中
    const baseMatchCondition = {
      'approvals.approver': { $in: [approverId, approverIdString] }
    };
    
    console.log('Date query:', dateQuery);
    console.log('Date query keys:', Object.keys(dateQuery));

    // 查询差旅统计数据
    const getTravelStats = async () => {
      console.log('=== Travel Stats Query ===');
      console.log('Collection/Table: travels (Travel model)');
      console.log('Approver ID:', approverId);
      console.log('Base match condition:', JSON.stringify(baseMatchCondition, null, 2));
      
      // 构建聚合查询的匹配条件
      const aggregateMatchCondition = {
        'approvals.approver': { $in: [approverId, approverIdString] }
      };
      
      // 如果有日期查询，添加到聚合查询的匹配条件中
      // 注意：日期查询应该在文档级别，而不是在unwind之后
      if (Object.keys(dateQuery).length > 0) {
        aggregateMatchCondition.createdAt = dateQuery;
      }
      
      console.log('Aggregate match condition:', JSON.stringify(aggregateMatchCondition, null, 2));
      
      // 先检查是否有匹配的文档（不包含日期条件）
      const matchedDocsWithoutDate = await Travel.find({
        'approvals.approver': { $in: [approverId, approverIdString] }
      }).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched documents count (without date filter):', matchedDocsWithoutDate.length);
      console.log('Sample matched documents (without date filter):', JSON.stringify(matchedDocsWithoutDate, null, 2));
      
      // 检查是否有匹配的文档（包含日期条件）
      const matchedDocsWithDate = await Travel.find(aggregateMatchCondition).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched documents count (with date filter):', matchedDocsWithDate.length);
      console.log('Sample matched documents (with date filter):', JSON.stringify(matchedDocsWithDate, null, 2));
      
      // 测试：分别查询日期条件和approver条件
      const matchedByDateOnly = await Travel.find({
        createdAt: dateQuery
      }).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched documents count (date only):', matchedByDateOnly.length);
      console.log('Sample matched documents (date only):', JSON.stringify(matchedByDateOnly, null, 2));
      
      // 测试：使用$and组合查询
      const matchedWithAnd = await Travel.find({
        $and: [
          { 'approvals.approver': { $in: [approverId, approverIdString] } },
          { createdAt: dateQuery }
        ]
      }).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched documents count (with $and):', matchedWithAnd.length);
      console.log('Sample matched documents (with $and):', JSON.stringify(matchedWithAnd, null, 2));
      
      // 检查所有Travel文档（不限制approver）
      const allTravels = await Travel.find({}).limit(3).select('_id approvals createdAt').lean();
      console.log('Total Travel documents sample:', JSON.stringify(allTravels, null, 2));
      
      // 检查Travel集合的总文档数
      const totalTravelCount = await Travel.countDocuments({});
      console.log('Total Travel documents in collection:', totalTravelCount);
      
      // 检查有approvals的Travel文档数
      const travelWithApprovalsCount = await Travel.countDocuments({ 'approvals.0': { $exists: true } });
      console.log('Travel documents with approvals:', travelWithApprovalsCount);
      
      // 检查有approvals且approver匹配的文档（不限制日期）
      const travelsWithMatchingApprover = await Travel.find({
        'approvals.approver': { $in: [approverId, approverIdString] }
      }).limit(5).select('_id approvals createdAt').lean();
      console.log('Travel documents with matching approver (no date filter):', travelsWithMatchingApprover.length);
      console.log('Sample travels with matching approver:', JSON.stringify(travelsWithMatchingApprover, null, 2));
      
      // 检查这些文档的createdAt是否在日期范围内
      if (travelsWithMatchingApprover.length > 0) {
        travelsWithMatchingApprover.forEach((travel, index) => {
          console.log(`Travel ${index} createdAt:`, travel.createdAt);
          console.log(`Travel ${index} createdAt in range?`, 
            (!dateQuery.$gte || travel.createdAt >= dateQuery.$gte) && 
            (!dateQuery.$lte || travel.createdAt <= dateQuery.$lte)
          );
        });
      }
      
      // 检查approvals数组中approver字段的格式
      if (allTravels.length > 0 && allTravels[0].approvals && allTravels[0].approvals.length > 0) {
        const firstApproval = allTravels[0].approvals[0];
        console.log('Sample approval object:', JSON.stringify(firstApproval, null, 2));
        console.log('Sample approval.approver:', firstApproval.approver);
        console.log('Sample approval.approver type:', typeof firstApproval.approver);
        console.log('Sample approval.approver is ObjectId?', firstApproval.approver instanceof mongoose.Types.ObjectId);
        console.log('Sample approval.approver toString:', String(firstApproval.approver));
      }
      
      // 检查approverId的类型
      console.log('ApproverId type:', typeof approverId);
      console.log('ApproverId value:', approverId);
      console.log('ApproverId toString:', String(approverId));
      console.log('ApproverId is ObjectId?', approverId instanceof mongoose.Types.ObjectId);
      console.log('ApproverIdString:', approverIdString);
      
      // 尝试直接查询匹配的approver
      const directMatch = await Travel.find({
        'approvals.approver': approverId
      }).limit(1).select('_id approvals').lean();
      console.log('Direct match with approverId (ObjectId):', directMatch.length);
      
      const directMatchString = await Travel.find({
        'approvals.approver': approverIdString
      }).limit(1).select('_id approvals').lean();
      console.log('Direct match with approverIdString:', directMatchString.length);
      
      const directMatchIn = await Travel.find({
        'approvals.approver': { $in: [approverId, approverIdString] }
      }).limit(1).select('_id approvals').lean();
      console.log('Direct match with $in:', directMatchIn.length);
      
      const stats = await Travel.aggregate([
        {
          $match: aggregateMatchCondition
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            totalAmount: { 
              $sum: { 
                $ifNull: [
                  { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                  0
                ]
              } 
            },
            avgAmount: { 
              $avg: { 
                $ifNull: [
                  { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                  0
                ]
              } 
            },
            totalApprovalTime: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$approvals.approvedAt', null] },
                      { $ne: ['$createdAt', null] }
                    ]
                  },
                  {
                    $divide: [
                      { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                      3600000 // Convert to hours
                    ]
                  },
                  0
                ]
              }
            },
            completedCount: {
              $sum: {
                $cond: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      console.log('Aggregation travel stats result:', JSON.stringify(stats, null, 2));

      const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
      });

      const completedCount = stats.reduce((sum, stat) => {
        return sum + (stat.completedCount || 0);
      }, 0);

      if (stats.length > 0) {
        result.avgAmount = result.totalAmount / result.total;
        const totalApprovalTime = stats.reduce((sum, stat) => sum + (stat.totalApprovalTime || 0), 0);
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
      }

      result.approvalRate = result.total > 0 ? parseFloat(((result.approved / result.total) * 100).toFixed(2)) : 0;

      console.log('Final expense stats result:', JSON.stringify(result, null, 2));

      return result;
    };

    // 查询费用统计数据
    const getExpenseStats = async () => {
      console.log('=== Expense Stats Query ===');
      console.log('Collection/Table: expenses (Expense model)');
      console.log('Approver ID:', approverId);
      console.log('Base match condition:', JSON.stringify(baseMatchCondition, null, 2));
      
      // 检查所有Expense文档（不限制approver）
      const allExpenses = await Expense.find({}).limit(3).select('_id approvals createdAt').lean();
      console.log('Total Expense documents sample:', JSON.stringify(allExpenses, null, 2));
      
      // 检查Expense集合的总文档数
      const totalExpenseCount = await Expense.countDocuments({});
      console.log('Total Expense documents in collection:', totalExpenseCount);
      
      // 检查有approvals的Expense文档数
      const expenseWithApprovalsCount = await Expense.countDocuments({ 'approvals.0': { $exists: true } });
      console.log('Expense documents with approvals:', expenseWithApprovalsCount);
      
      // 构建聚合查询的匹配条件
      const aggregateMatchConditionExpense = {
        'approvals.approver': { $in: [approverId, approverIdString] }
      };
      
      // 如果有日期查询，添加到聚合查询的匹配条件中
      if (Object.keys(dateQuery).length > 0) {
        aggregateMatchConditionExpense.createdAt = dateQuery;
      }
      
      console.log('Expense aggregate match condition:', JSON.stringify(aggregateMatchConditionExpense, null, 2));
      
      // 先检查是否有匹配的文档（不包含日期条件）
      const matchedDocsWithoutDate = await Expense.find({
        'approvals.approver': { $in: [approverId, approverIdString] }
      }).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched expense documents count (without date filter):', matchedDocsWithoutDate.length);
      console.log('Sample matched expense documents (without date filter):', JSON.stringify(matchedDocsWithoutDate, null, 2));
      
      // 检查是否有匹配的文档（包含日期条件）
      const matchedDocsWithDate = await Expense.find(aggregateMatchConditionExpense).limit(5).select('_id approvals createdAt').lean();
      console.log('Matched expense documents count (with date filter):', matchedDocsWithDate.length);
      console.log('Sample matched expense documents (with date filter):', JSON.stringify(matchedDocsWithDate, null, 2));
      
      const stats = await Expense.aggregate([
        {
          $match: aggregateMatchConditionExpense
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: '$approvals.status',
            count: { $sum: 1 },
            totalAmount: { 
              $sum: { 
                $ifNull: [
                  { $ifNull: ['$totalAmount', '$amount'] },
                  0
                ]
              } 
            },
            avgAmount: { 
              $avg: { 
                $ifNull: [
                  { $ifNull: ['$totalAmount', '$amount'] },
                  0
                ]
              } 
            },
            totalApprovalTime: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$approvals.approvedAt', null] },
                      { $ne: ['$createdAt', null] }
                    ]
                  },
                  {
                    $divide: [
                      { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                      3600000 // Convert to hours
                    ]
                  },
                  0
                ]
              }
            },
            completedCount: {
              $sum: {
                $cond: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
      });

      const completedCount = stats.reduce((sum, stat) => {
        return sum + (stat.completedCount || 0);
      }, 0);

      if (stats.length > 0) {
        result.avgAmount = result.totalAmount / result.total;
        const totalApprovalTime = stats.reduce((sum, stat) => sum + (stat.totalApprovalTime || 0), 0);
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
      }

      result.approvalRate = result.total > 0 ? parseFloat(((result.approved / result.total) * 100).toFixed(2)) : 0;

      return result;
    };

    // 根据type参数决定查询哪些数据
    const results = {};
    if (!type || type === 'travel') {
      results.travel = await getTravelStats();
    }
    if (!type || type === 'expense') {
      results.expense = await getExpenseStats();
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Get approval statistics error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request user:', req.user);
    console.error('Query params:', { startDate, endDate, type });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Get approver workload statistics
// @route   GET /api/approvals/approver-workload
// @access  Private
router.get('/approver-workload', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 构建日期查询
    // 注意：结束日期应该包含当天的23:59:59.999，而不是00:00:00
    // 使用UTC时间避免时区问题
    const dateQuery = {};
    if (startDate) {
      // 开始日期：设置为当天的00:00:00.000 UTC
      const start = new Date(startDate + 'T00:00:00.000Z');
      dateQuery.$gte = start;
    }
    if (endDate) {
      // 结束日期：设置为当天的23:59:59.999 UTC，以包含整天的数据
      const end = new Date(endDate + 'T23:59:59.999Z');
      dateQuery.$lte = end;
    }

    const matchStage = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    // 聚合查询差旅审批人工作量
    const travelWorkload = await Travel.aggregate([
      {
        $match: matchStage
      },
      {
        $unwind: '$approvals'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvals.approver',
          foreignField: '_id',
          as: 'approverInfo'
        }
      },
      {
        $unwind: '$approverInfo'
      },
      {
        $group: {
          _id: '$approvals.approver',
          approverName: { $first: { $concat: ['$approverInfo.firstName', ' ', '$approverInfo.lastName'] } },
          pending: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'rejected'] }, 1, 0] }
          },
          total: { $sum: 1 },
          totalApprovalTime: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  '$approvals.approvedAt',
                  '$approvals.createdAt'
                ]},
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$approvals.createdAt'] },
                    3600000 // Convert to hours
                  ]
                },
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $in: ['$approvals.status', ['approved', 'rejected']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 聚合查询费用审批人工作量
    const expenseWorkload = await Expense.aggregate([
      {
        $match: matchStage
      },
      {
        $unwind: '$approvals'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvals.approver',
          foreignField: '_id',
          as: 'approverInfo'
        }
      },
      {
        $unwind: '$approverInfo'
      },
      {
        $group: {
          _id: '$approvals.approver',
          approverName: { $first: { $concat: ['$approverInfo.firstName', ' ', '$approverInfo.lastName'] } },
          pending: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$approvals.status', 'rejected'] }, 1, 0] }
          },
          total: { $sum: 1 },
          totalApprovalTime: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ['$approvals.status', ['approved', 'rejected']] },
                  '$approvals.approvedAt',
                  '$approvals.createdAt'
                ]},
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$approvals.createdAt'] },
                    3600000 // Convert to hours
                  ]
                },
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $in: ['$approvals.status', ['approved', 'rejected']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 合并差旅和费用数据
    const workloadMap = {};
    
    travelWorkload.forEach(item => {
      const key = String(item._id);
      if (!workloadMap[key]) {
        workloadMap[key] = {
          _id: item._id,
          approverName: item.approverName,
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          totalApprovalTime: 0,
          completedCount: 0
        };
      }
      workloadMap[key].pending += item.pending;
      workloadMap[key].approved += item.approved;
      workloadMap[key].rejected += item.rejected;
      workloadMap[key].total += item.total;
      workloadMap[key].totalApprovalTime += item.totalApprovalTime;
      workloadMap[key].completedCount += item.completedCount;
    });

    expenseWorkload.forEach(item => {
      const key = String(item._id);
      if (!workloadMap[key]) {
        workloadMap[key] = {
          _id: item._id,
          approverName: item.approverName,
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          totalApprovalTime: 0,
          completedCount: 0
        };
      }
      workloadMap[key].pending += item.pending;
      workloadMap[key].approved += item.approved;
      workloadMap[key].rejected += item.rejected;
      workloadMap[key].total += item.total;
      workloadMap[key].totalApprovalTime += item.totalApprovalTime;
      workloadMap[key].completedCount += item.completedCount;
    });

    // 转换为数组并计算最终指标
    const workload = Object.values(workloadMap).map(item => ({
      _id: item._id,
      approverName: item.approverName,
      pending: item.pending,
      approved: item.approved,
      rejected: item.rejected,
      total: item.total,
      approvalRate: item.total > 0 ? parseFloat(((item.approved / item.total) * 100).toFixed(2)) : 0,
      avgApprovalTime: item.completedCount > 0 ? parseFloat((item.totalApprovalTime / item.completedCount).toFixed(2)) : 0
    })).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: workload
    });
  } catch (error) {
    console.error('Get approver workload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get approval trend data
// @route   GET /api/approvals/trend
// @access  Private
router.get('/trend', protect, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    // 构建日期查询
    // 注意：结束日期应该包含当天的23:59:59.999，而不是00:00:00
    // 使用UTC时间避免时区问题
    const dateQuery = {};
    if (startDate) {
      // 开始日期：设置为当天的00:00:00.000 UTC
      const start = new Date(startDate + 'T00:00:00.000Z');
      dateQuery.$gte = start;
    }
    if (endDate) {
      // 结束日期：设置为当天的23:59:59.999 UTC，以包含整天的数据
      const end = new Date(endDate + 'T23:59:59.999Z');
      dateQuery.$lte = end;
    }

    const matchStage = Object.keys(dateQuery).length > 0 
      ? { createdAt: dateQuery }
      : {};

    // 确保req.user.id正确转换为ObjectId
    // 注意：MongoDB查询数组字段时，ObjectId和字符串可能不匹配
    // 我们需要同时尝试ObjectId和字符串格式
    let approverId;
    let approverIdString;
    try {
      if (mongoose.Types.ObjectId.isValid(req.user.id)) {
        approverId = mongoose.Types.ObjectId(req.user.id);
        approverIdString = String(req.user.id);
      } else {
        approverId = req.user.id;
        approverIdString = String(req.user.id);
      }
    } catch (error) {
      approverId = req.user.id;
      approverIdString = String(req.user.id);
    }

    // 获取差旅趋势数据
    const getTravelTrend = async () => {
      return await Travel.aggregate([
        {
          $match: matchStage
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$approvals.createdAt'
                }
              },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            data: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            }
          }
        },
        {
          $project: {
            date: '$_id',
            pending: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'pending'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            },
            approved: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'approved'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            },
            rejected: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'rejected'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);
    };

    // 获取费用趋势数据
    const getExpenseTrend = async () => {
      return await Expense.aggregate([
        {
          $match: matchStage
        },
        {
          $unwind: '$approvals'
        },
        {
          $match: {
            'approvals.approver': { $in: [approverId, approverIdString] }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$approvals.createdAt'
                }
              },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            data: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            }
          }
        },
        {
          $project: {
            date: '$_id',
            pending: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'pending'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            },
            approved: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'approved'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            },
            rejected: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$data',
                      cond: { $eq: ['$$this.status', 'rejected'] }
                    }
                  },
                  in: '$$this.count'
                }
              }
            }
          }
        },
        {
          $sort: { date: 1 }
        }
      ]);
    };

    // 根据type参数决定查询哪些数据
    let trendData = [];
    if (!type || type === 'all') {
      // 查询所有类型的数据并合并
      const [travelTrend, expenseTrend] = await Promise.all([
        getTravelTrend(),
        getExpenseTrend()
      ]);
      
      // 合并数据
      const trendMap = {};
      [...travelTrend, ...expenseTrend].forEach(item => {
        if (!trendMap[item.date]) {
          trendMap[item.date] = { date: item.date, pending: 0, approved: 0, rejected: 0 };
        }
        trendMap[item.date].pending += item.pending || 0;
        trendMap[item.date].approved += item.approved || 0;
        trendMap[item.date].rejected += item.rejected || 0;
      });
      trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
    } else if (type === 'travel') {
      trendData = await getTravelTrend();
    } else if (type === 'expense') {
      trendData = await getExpenseTrend();
    }

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Get approval trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get employee travel statistics for approval card
// @route   GET /api/approvals/travel-statistics/:employeeId
// @access  Private
router.get('/travel-statistics/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    // 验证employeeId格式
    let employeeObjectId;
    try {
      employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format',
        error: error.message
      });
    }

    // 获取员工年度差旅统计
    const travelStats = await Travel.aggregate([
      {
        $match: {
          employee: employeeObjectId,
          createdAt: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalAmount: { 
            $sum: { 
              $ifNull: ['$estimatedBudget', '$estimatedCost', 0] 
            } 
          },
          totalDays: {
            $sum: {
              $cond: [
                { $and: ['$startDate', '$endDate'] },
                {
                  $add: [
                    1,
                    {
                      $divide: [
                        { $subtract: ['$endDate', '$startDate'] },
                        1000 * 60 * 60 * 24
                      ]
                    }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = travelStats[0] || { totalTrips: 0, totalAmount: 0, totalDays: 0 };
    
    // 计算人天效率（总金额/总天数）
    const efficiency = stats.totalDays > 0 
      ? (stats.totalAmount / stats.totalDays).toFixed(2)
      : 0;

    // 获取员工部门信息
    const employee = await User.findById(employeeId).select('department').lean();
    
    // 获取部门预算（如果有预算系统，这里需要根据实际情况调整）
    // 暂时返回null，需要根据实际的预算模型调整
    let departmentBudget = null;
    let budgetUsage = null;
    
    // TODO: 集成部门预算系统
    // const department = await Department.findOne({ name: employee?.department });
    // if (department && department.budget) {
    //   departmentBudget = department.budget;
    //   budgetUsage = stats.totalAmount > 0 ? ((stats.totalAmount / departmentBudget) * 100).toFixed(1) : 0;
    // }

    res.json({
      success: true,
      data: {
        year: currentYear,
        totalTrips: stats.totalTrips,
        totalAmount: stats.totalAmount || 0,
        totalDays: Math.round(stats.totalDays || 0),
        efficiency: parseFloat(efficiency),
        departmentBudget,
        budgetUsage: budgetUsage ? parseFloat(budgetUsage) : null
      }
    });
  } catch (error) {
    console.error('Get travel statistics error:', error);
    res.status(500).json({
      success: false,
      message: '获取差旅统计失败',
      error: error.message
    });
  }
});

module.exports = router;
