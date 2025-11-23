const express = require('express');
const { protect } = require('../middleware/auth');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get pending approvals
// @route   GET /api/approvals
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get travel requests pending approval（优化：使用 select 和 lean）
    const pendingTravels = await Travel.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .select('title travelNumber status startDate endDate destination employee approvals createdAt')
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email')
      .lean();

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    pendingTravels.forEach(travel => {
      if (travel.approvals && Array.isArray(travel.approvals)) {
        travel.approvals = travel.approvals.filter(
          approval => approval.approver !== null && approval.approver !== undefined
        );
      }
    });

    // Get expenses pending approval（优化：使用 select 和 lean）
    const pendingExpenses = await Expense.find({
      'approvals.approver': req.user.id,
      'approvals.status': 'pending'
    })
      .select('title amount date category status currency reimbursementNumber employee travel approvals createdAt')
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination')
      .lean();

    // 注意：如果 travel 关联的差旅被删除，populate 会将 travel 设置为 null
    // 这是正常行为，前端需要处理 null 值

    res.json({
      success: true,
      data: {
        travels: pendingTravels,
        expenses: pendingExpenses
      }
    });
  } catch (error) {
    logger.error('Get approvals error:', error);
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
    const { action, status, comments } = req.body;
    
    // 支持两种参数格式：action ('approve'/'reject') 或 status ('approved'/'rejected')
    let approvalAction;
    if (action) {
      approvalAction = action; // 'approve' 或 'reject'
    } else if (status) {
      // 将 status 转换为 action
      approvalAction = status === 'approved' ? 'approve' : 'reject';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: action or status'
      });
    }
    
    const travel = await Travel.findById(req.params.id);

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: 'Travel request not found'
      });
    }

    // Find the approval record for this approver
    const approvalIndex = travel.approvals.findIndex(
      approval => String(approval.approver) === String(req.user.id) && approval.status === 'pending'
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'No pending approval found for this user'
      });
    }

    // Update approval status
    travel.approvals[approvalIndex].status = approvalAction === 'approve' ? 'approved' : 'rejected';
    travel.approvals[approvalIndex].approvedAt = new Date();
    if (comments) {
      travel.approvals[approvalIndex].comments = comments;
    }

    // Check if all approvals are completed
    const allApproved = travel.approvals.every(approval => 
      approval.status === 'approved' || approval.status === 'rejected'
    );

    const wasPending = travel.approvals[approvalIndex].status === 'pending';
    const isApproved = approvalAction === 'approve';
    const isRejected = approvalAction === 'reject';

    if (allApproved) {
      const hasRejected = travel.approvals.some(approval => approval.status === 'rejected');
      travel.status = hasRejected ? 'rejected' : 'approved';
    }

    await travel.save();

    // 发送通知给申请人
    try {
      const travelPopulated = await Travel.findById(travel._id)
        .populate('employee', 'firstName lastName email');
      
      if (travelPopulated && travelPopulated.employee) {
        if (allApproved) {
          // 所有审批完成，发送最终结果通知
          if (hasRejected) {
            await notificationService.notifyApprovalRejected({
              requester: travelPopulated.employee,
              requestType: 'travel',
              requestId: travel._id,
              requestTitle: travel.title || travel.travelNumber || '差旅申请',
              approver: {
                _id: req.user.id,
                firstName: req.user.firstName,
                lastName: req.user.lastName
              },
              comments: comments || '无'
            });
          } else {
            await notificationService.notifyApprovalApproved({
              requester: travelPopulated.employee,
              requestType: 'travel',
              requestId: travel._id,
              requestTitle: travel.title || travel.travelNumber || '差旅申请',
              approver: {
                _id: req.user.id,
                firstName: req.user.firstName,
                lastName: req.user.lastName
              }
            });
          }
        } else if (wasPending) {
          // 部分审批完成，发送中间状态通知（可选）
          // 这里可以根据业务需求决定是否发送中间状态通知
        }
      }
    } catch (notifyError) {
      logger.error('Failed to send approval notification:', notifyError);
      // 通知失败不影响审批流程
    }

    res.json({
      success: true,
      data: travel
    });
  } catch (error) {
    logger.error('Approve travel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Approve/Reject expense request
// @route   PUT /api/approvals/expense/:id
// @access  Private
router.put('/expense/:id', protect, async (req, res) => {
  try {
    const { action, status, comments } = req.body;
    
    // 支持两种参数格式：action ('approve'/'reject') 或 status ('approved'/'rejected')
    let approvalAction;
    if (action) {
      approvalAction = action; // 'approve' 或 'reject'
    } else if (status) {
      // 将 status 转换为 action
      approvalAction = status === 'approved' ? 'approve' : 'reject';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: action or status'
      });
    }
    
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense request not found'
      });
    }

    // Find the approval record for this approver
    const approvalIndex = expense.approvals.findIndex(
      approval => String(approval.approver) === String(req.user.id) && approval.status === 'pending'
    );

    if (approvalIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'No pending approval found for this user'
      });
    }

    // Update approval status
    expense.approvals[approvalIndex].status = approvalAction === 'approve' ? 'approved' : 'rejected';
    expense.approvals[approvalIndex].approvedAt = new Date();
    if (comments) {
      expense.approvals[approvalIndex].comments = comments;
    }

    // Check if all approvals are completed
    const allApproved = expense.approvals.every(approval => 
      approval.status === 'approved' || approval.status === 'rejected'
    );

    const wasPending = expense.approvals[approvalIndex].status === 'pending';
    const isApproved = approvalAction === 'approve';
    const isRejected = approvalAction === 'reject';

    if (allApproved) {
      const hasRejected = expense.approvals.some(approval => approval.status === 'rejected');
      expense.status = hasRejected ? 'rejected' : 'approved';
    }

    await expense.save();

    // 发送通知给申请人
    try {
      const expensePopulated = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email');
      
      if (expensePopulated && expensePopulated.employee) {
        if (allApproved) {
          // 所有审批完成，发送最终结果通知
          const hasRejected = expense.approvals.some(approval => approval.status === 'rejected');
          if (hasRejected) {
            await notificationService.notifyApprovalRejected({
              requester: expensePopulated.employee,
              requestType: 'expense',
              requestId: expense._id,
              requestTitle: expense.title || '费用申请',
              approver: {
                _id: req.user.id,
                firstName: req.user.firstName,
                lastName: req.user.lastName
              },
              comments: comments || '无'
            });
          } else {
            await notificationService.notifyApprovalApproved({
              requester: expensePopulated.employee,
              requestType: 'expense',
              requestId: expense._id,
              requestTitle: expense.title || '费用申请',
              approver: {
                _id: req.user.id,
                firstName: req.user.firstName,
                lastName: req.user.lastName
              }
            });
          }
        } else if (wasPending) {
          // 部分审批完成，发送中间状态通知（可选）
          // 这里可以根据业务需求决定是否发送中间状态通知
        }
      }
    } catch (notifyError) {
      logger.error('Failed to send approval notification:', notifyError);
      // 通知失败不影响审批流程
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    logger.error('Approve expense error:', error);
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
    const approverId = req.user.id;
    const approverIdString = String(approverId);

    // Get travel approvals history
    // 返回包含完整approvals数组的申请对象，让前端自己过滤
    const travelHistory = await Travel.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .populate('approvals.approver', 'firstName lastName email position')
      .select('title travelNumber status estimatedBudget estimatedCost currency startDate endDate destination outbound inbound multiCityRoutes createdAt approvals employee')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    travelHistory.forEach(travel => {
      if (travel.approvals && Array.isArray(travel.approvals)) {
        travel.approvals = travel.approvals.filter(
          approval => approval.approver !== null && approval.approver !== undefined
        );
      }
    });

    // Get expense approvals history
    const expenseHistory = await Expense.find({
      'approvals.approver': { $in: [approverId, approverIdString] },
      'approvals.status': { $in: ['approved', 'rejected'] }
    })
      .populate('employee', 'firstName lastName email')
      .populate('travel', 'title destination')
      .populate('approvals.approver', 'firstName lastName email position')
      .select('title expenseNumber totalAmount amount currency expenseDate date createdAt approvals employee travel')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 过滤掉 approver 为 null 的审批记录（审批人可能已被删除）
    expenseHistory.forEach(expense => {
      if (expense.approvals && Array.isArray(expense.approvals)) {
        expense.approvals = expense.approvals.filter(
          approval => approval.approver !== null && approval.approver !== undefined
        );
      }
      // 注意：如果 travel 关联的差旅被删除，populate 会将 travel 设置为 null
      // 这是正常行为，前端需要处理 null 值
    });

    logger.info('=== Approval History API ===');
    logger.info('Approver ID:', approverId);
    logger.info('Travel history count:', travelHistory.length);
    logger.info('Expense history count:', expenseHistory.length);

    res.json({
      success: true,
      data: {
        travels: travelHistory,
        expenses: expenseHistory
      }
    });
  } catch (error) {
    logger.error('Get approval history error:', error);
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
  try {
    const { startDate, endDate, type } = req.query;

    logger.info('=== Approval Statistics API ===');
    logger.info('Query params:', { startDate, endDate, type });
    const currentDate = new Date();
    logger.info('Current date:', currentDate.toISOString());

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    let hasDateFilter = false;
    if (startDate) {
      const startDateObj = new Date(startDate + 'T00:00:00.000Z');
      dateMatch.$gte = startDateObj;
      logger.debug('Start date match:', startDateObj.toISOString());
      hasDateFilter = true;
      
      // 检查日期范围是否合理（未来日期可能是系统时间错误）
      if (startDateObj > currentDate) {
        logger.warn('WARNING: Start date is in the future! This may indicate a system time issue.');
      }
    }
    if (endDate) {
      const endDateObj = new Date(endDate + 'T23:59:59.999Z');
      dateMatch.$lte = endDateObj;
      logger.debug('End date match:', endDateObj.toISOString());
      hasDateFilter = true;
      
      // 检查日期范围是否合理
      if (endDateObj > currentDate) {
        logger.warn('WARNING: End date is in the future! This may indicate a system time issue.');
      }
    }
    logger.debug('Date match object:', dateMatch);
    logger.debug('Has date filter:', hasDateFilter);

    // 查询差旅统计数据
    // 按申请的整体状态统计，而不是审批节点数量
    const getTravelStats = async () => {
      const pipeline = [];
      
      // 只统计有审批流程的申请（有approvals数组且不为空）
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        logger.debug('Adding date match to travel pipeline:', dateMatch);
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      // 优化：添加 $project 只选择需要的字段
      pipeline.push({
        $project: {
          status: 1,
          estimatedBudget: 1,
          estimatedCost: 1,
          createdAt: 1
        }
      });
      
      // 按申请的整体status分组统计
      pipeline.push({
        $group: {
          _id: '$status',
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
          }
        }
      });

      const stats = await Travel.aggregate(pipeline);
      
      logger.debug('Travel stats pipeline result:', JSON.stringify(stats, null, 2));
      
      const result = {
        pending: 0,      // submitted状态（流程未完成）
        approved: 0,    // approved状态（流程已完成且通过）
        rejected: 0,    // rejected状态（流程已完成但被拒绝）
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      // 映射状态：submitted -> pending
      stats.forEach(stat => {
        if (stat._id === 'submitted') {
          result.pending += stat.count;
        } else if (stat._id === 'approved') {
          result.approved += stat.count;
        } else if (stat._id === 'rejected') {
          result.rejected += stat.count;
        }
        // 所有状态的申请都计入总数和总金额
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
        logger.debug(`Travel stat: status=${stat._id}, count=${stat.count}, totalAmount=${stat.totalAmount || 0}`);
      });
      
      logger.debug('Travel stats result:', result);
      logger.debug('Travel avgAmount calculation:', {
        totalAmount: result.totalAmount,
        total: result.total,
        avgAmount: result.total > 0 ? result.totalAmount / result.total : 0
      });

      // 重新查询已完成审批的申请以计算平均审批时间
      const completedTravels = await Travel.find({
        approvals: { $exists: true, $ne: [] },
        $expr: { $gt: [{ $size: '$approvals' }, 0] },
        status: { $in: ['approved', 'rejected'] },
        ...(Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {})
      }).select('createdAt approvals').lean();

      let totalApprovalTime = 0;
      let completedCount = 0;
      
      completedTravels.forEach(travel => {
        const lastApproval = travel.approvals
          .filter(a => a.approvedAt)
          .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt))[0];
        
        if (lastApproval && travel.createdAt) {
          const approvalTime = (new Date(lastApproval.approvedAt) - new Date(travel.createdAt)) / 3600000; // 转换为小时
          totalApprovalTime += approvalTime;
          completedCount++;
        }
      });

      if (result.total > 0) {
        result.avgAmount = result.totalAmount / result.total;
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
        const totalCompleted = result.approved + result.rejected;
        result.approvalRate = totalCompleted > 0 
          ? parseFloat(((result.approved / totalCompleted) * 100).toFixed(2))
          : 0;
      } else {
        // 即使没有数据，也确保返回0而不是undefined
        result.avgAmount = 0;
        result.avgApprovalTime = 0;
        result.approvalRate = 0;
      }

      logger.debug('Travel final result:', {
        ...result,
        avgAmount: result.avgAmount,
        avgAmountFormatted: result.avgAmount.toFixed(2)
      });

      return result;
    };

    // 查询费用统计数据
    // 按申请的整体状态统计，而不是审批节点数量
    const getExpenseStats = async () => {
      const pipeline = [];
      
      // 只统计有审批流程的申请（有approvals数组且不为空）
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      // 优化：添加 $project 只选择需要的字段
      pipeline.push({
        $project: {
          status: 1,
          totalAmount: 1,
          amount: 1,
          createdAt: 1
        }
      });
      
      // 按申请的整体status分组统计
      pipeline.push({
        $group: {
          _id: '$status',
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
          }
        }
      });

      const stats = await Expense.aggregate(pipeline);
      
      logger.debug('Expense stats pipeline result:', JSON.stringify(stats, null, 2));
      
      const result = {
        pending: 0,      // submitted状态（流程未完成）
        approved: 0,    // approved状态（流程已完成且通过）
        rejected: 0,    // rejected状态（流程已完成但被拒绝）
        total: 0,
        totalAmount: 0,
        avgAmount: 0,
        avgApprovalTime: 0,
        approvalRate: 0
      };

      // 映射状态：submitted -> pending
      stats.forEach(stat => {
        if (stat._id === 'submitted') {
          result.pending += stat.count;
        } else if (stat._id === 'approved') {
          result.approved += stat.count;
        } else if (stat._id === 'rejected') {
          result.rejected += stat.count;
        }
        // 所有状态的申请都计入总数和总金额
        result.total += stat.count;
        result.totalAmount += stat.totalAmount || 0;
        logger.debug(`Expense stat: status=${stat._id}, count=${stat.count}, totalAmount=${stat.totalAmount || 0}`);
      });
      
      logger.debug('Expense stats result:', result);
      logger.debug('Expense avgAmount calculation:', {
        totalAmount: result.totalAmount,
        total: result.total,
        avgAmount: result.total > 0 ? result.totalAmount / result.total : 0
      });

      // 重新查询已完成审批的申请以计算平均审批时间
      const completedExpenses = await Expense.find({
        approvals: { $exists: true, $ne: [] },
        $expr: { $gt: [{ $size: '$approvals' }, 0] },
        status: { $in: ['approved', 'rejected'] },
        ...(Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {})
      }).select('createdAt approvals').lean();

      let totalApprovalTime = 0;
      let completedCount = 0;
      
      completedExpenses.forEach(expense => {
        const lastApproval = expense.approvals
          .filter(a => a.approvedAt)
          .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt))[0];
        
        if (lastApproval && expense.createdAt) {
          const approvalTime = (new Date(lastApproval.approvedAt) - new Date(expense.createdAt)) / 3600000; // 转换为小时
          totalApprovalTime += approvalTime;
          completedCount++;
        }
      });

      if (result.total > 0) {
        result.avgAmount = result.totalAmount / result.total;
        result.avgApprovalTime = completedCount > 0 ? totalApprovalTime / completedCount : 0;
        const totalCompleted = result.approved + result.rejected;
        result.approvalRate = totalCompleted > 0 
          ? parseFloat(((result.approved / totalCompleted) * 100).toFixed(2))
          : 0;
      } else {
        // 即使没有数据，也确保返回0而不是undefined
        result.avgAmount = 0;
        result.avgApprovalTime = 0;
        result.approvalRate = 0;
      }

      logger.debug('Expense final result:', {
        ...result,
        avgAmount: result.avgAmount,
        avgAmountFormatted: result.avgAmount.toFixed(2)
      });

      return result;
    };

    // 根据type参数决定查询哪些数据
    const results = {};

    if (!type || type === 'travel' || type === 'all') {
      results.travel = await getTravelStats();
    }

    if (!type || type === 'expense' || type === 'all') {
      results.expense = await getExpenseStats();
    }

    // 设置响应头，禁止缓存，确保数据实时更新
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Get approval statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get approver workload statistics
// @route   GET /api/approvals/approver-workload
// @access  Private
router.get('/approver-workload', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const matchStage = Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};

    // 聚合查询差旅审批人工作量（优化：添加 $project 只选择需要的字段）
    const travelWorkload = await Travel.aggregate([
      {
        $match: matchStage
      },
      {
        $project: {
          approvals: 1,
          createdAt: 1
        }
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
                {
                  $and: [
                    { $in: ['$approvals.status', ['approved', 'rejected']] },
                    { $ne: ['$approvals.approvedAt', null] },
                    { $ne: ['$createdAt', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                    3600000
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

    // 聚合查询费用审批人工作量（优化：添加 $project 只选择需要的字段）
    const expenseWorkload = await Expense.aggregate([
      {
        $match: matchStage
      },
      {
        $project: {
          approvals: 1,
          createdAt: 1
        }
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
                {
                  $and: [
                    { $in: ['$approvals.status', ['approved', 'rejected']] },
                    { $ne: ['$approvals.approvedAt', null] },
                    { $ne: ['$createdAt', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$approvals.approvedAt', '$createdAt'] },
                    3600000
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

    // 合并差旅和费用的工作量数据
    const workloadMap = new Map();

    [...travelWorkload, ...expenseWorkload].forEach(item => {
      const key = String(item._id);
      if (workloadMap.has(key)) {
        const existing = workloadMap.get(key);
        existing.pending += item.pending;
        existing.approved += item.approved;
        existing.rejected += item.rejected;
        existing.total += item.total;
        existing.totalApprovalTime += item.totalApprovalTime;
        existing.completedCount += item.completedCount;
      } else {
        workloadMap.set(key, {
          approverId: item._id,
          approverName: item.approverName,
          pending: item.pending,
          approved: item.approved,
          rejected: item.rejected,
          total: item.total,
          totalApprovalTime: item.totalApprovalTime,
          completedCount: item.completedCount
        });
      }
    });

    // 计算平均审批时间和审批率
    const workload = Array.from(workloadMap.values()).map(item => ({
      ...item,
      avgApprovalTime: item.completedCount > 0 ? item.totalApprovalTime / item.completedCount : 0,
      approvalRate: item.completedCount > 0 ? parseFloat(((item.approved / item.completedCount) * 100).toFixed(2)) : 0
    }));

    res.json({
      success: true,
      data: workload
    });
  } catch (error) {
    logger.error('Get approver workload error:', error);
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

    logger.info('=== Approval Trend API ===');
    logger.info('Query params:', { startDate, endDate, type });

    // 构建日期查询条件（UTC时间）
    const dateMatch = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      dateMatch.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // 查询差旅趋势数据
    const getTravelTrend = async () => {
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      pipeline.push(
        { $unwind: '$approvals' },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      );

      return await Travel.aggregate(pipeline);
    };

    // 查询费用趋势数据
    const getExpenseTrend = async () => {
      const pipeline = [];
      
      // 先过滤掉 approvals 数组为空的记录
      pipeline.push({
        $match: {
          approvals: { $exists: true, $ne: [] },
          $expr: { $gt: [{ $size: '$approvals' }, 0] }
        }
      });
      
      // 如果有日期条件，添加日期匹配
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { createdAt: dateMatch } });
      }
      
      // 优化：添加 $project 只选择需要的字段
      pipeline.push({
        $project: {
          approvals: 1,
          createdAt: 1
        }
      });
      
      pipeline.push(
        { $unwind: '$approvals' },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$approvals.status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      );

      return await Expense.aggregate(pipeline);
    };

    let trendData = [];

    if (!type || type === 'travel' || type === 'all') {
      const travelTrend = await getTravelTrend();
      logger.debug('Travel trend data:', travelTrend);
      trendData = [...trendData, ...travelTrend.map(item => ({ ...item, type: 'travel' }))];
    }

    if (!type || type === 'expense' || type === 'all') {
      const expenseTrend = await getExpenseTrend();
      logger.debug('Expense trend data:', expenseTrend);
      trendData = [...trendData, ...expenseTrend.map(item => ({ ...item, type: 'expense' }))];
    }

    // 合并相同日期和状态的数据，并转换为前端期望的格式
    const dateMap = new Map();
    trendData.forEach(item => {
      const date = item._id.date;
      const status = item._id.status;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          pending: 0,
          approved: 0,
          rejected: 0
        });
      }
      
      const dateData = dateMap.get(date);
      if (status === 'pending') {
        dateData.pending += item.count;
      } else if (status === 'approved') {
        dateData.approved += item.count;
      } else if (status === 'rejected') {
        dateData.rejected += item.count;
      }
    });

    const result = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    logger.debug('Trend result:', result);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get approval trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get travel statistics for an employee
// @route   GET /api/approvals/travel-statistics/:employeeId
// @access  Private
router.get('/travel-statistics/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID'
      });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const stats = await Travel.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(employeeId),
          createdAt: {
            $gte: yearStart,
            $lte: yearEnd
          }
        }
      },
      {
        // 优化：添加 $project 只选择需要的字段
        $project: {
          estimatedBudget: 1,
          estimatedCost: 1,
          startDate: 1,
          endDate: 1
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalAmount: {
            $sum: {
              $ifNull: [
                { $ifNull: ['$estimatedBudget', '$estimatedCost'] },
                0
              ]
            }
          },
          totalDays: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$startDate', null] },
                    { $ne: ['$endDate', null] }
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$endDate', '$startDate'] },
                    86400000
                  ]
                },
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTrips: 0,
      totalAmount: 0,
      totalDays: 0
    };

    result.efficiency = result.totalDays > 0 
      ? parseFloat((result.totalAmount / result.totalDays).toFixed(2))
      : 0;

    // 获取员工信息以获取部门预算
    const employee = await User.findById(employeeId).select('department');
    if (employee && employee.department) {
      // 这里可以添加部门预算查询逻辑
      result.budgetUsage = 0; // 暂时返回0，需要根据实际业务逻辑实现
    } else {
      result.budgetUsage = 0;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get travel statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
