const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');

// @route   GET /api/approval-workflows
// @desc    获取所有审批流程
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, isActive } = req.query;
    
    const query = {};
    if (type) query.appliesTo = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const workflows = await ApprovalWorkflow.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      message: '获取审批流程失败',
      error: error.message
    });
  }
});

// @route   GET /api/approval-workflows/:id
// @desc    获取单个审批流程
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '审批流程不存在'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      message: '获取审批流程失败',
      error: error.message
    });
  }
});

// @route   POST /api/approval-workflows
// @desc    创建审批流程
// @access  Private (Admin only)
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      conditions,
      steps,
      priority,
      isActive
    } = req.body;

    // 验证必填字段
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: '流程名称和类型为必填项'
      });
    }

    if (!steps || steps.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个审批步骤'
      });
    }

    // 检查名称是否已存在
    const existingWorkflow = await ApprovalWorkflow.findOne({ name });
    if (existingWorkflow) {
      return res.status(400).json({
        success: false,
        message: '该流程名称已存在'
      });
    }

    const workflow = new ApprovalWorkflow({
      name,
      description,
      appliesTo: type,
      conditions: {
        minAmount: conditions?.amountRange?.min || 0,
        maxAmount: conditions?.amountRange?.max === Number.MAX_SAFE_INTEGER || !conditions?.amountRange?.max
          ? 999999999999
          : conditions.amountRange.max,
        department: conditions?.departments?.[0],
        jobLevel: conditions?.jobLevels?.[0]
      },
      steps: steps.map((step, index) => ({
        level: index + 1,
        approverType: step.approverType,
        role: step.approverRoles?.[0],
        user: step.approverUsers?.[0],
        department: step.department
      })),
      priority: priority || 0,
      isActive: isActive !== false,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await workflow.save();

    res.status(201).json({
      success: true,
      message: '审批流程创建成功',
      data: workflow
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      message: '创建审批流程失败',
      error: error.message
    });
  }
});

// @route   PUT /api/approval-workflows/:id
// @desc    更新审批流程
// @access  Private (Admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '审批流程不存在'
      });
    }

    const {
      name,
      description,
      type,
      conditions,
      steps,
      priority,
      isActive
    } = req.body;

    // 如果修改名称，检查是否与其他流程重复
    if (name && name !== workflow.name) {
      const existingWorkflow = await ApprovalWorkflow.findOne({ 
        name, 
        _id: { $ne: req.params.id } 
      });
      if (existingWorkflow) {
        return res.status(400).json({
          success: false,
          message: '该流程名称已存在'
        });
      }
      workflow.name = name;
    }

    if (description !== undefined) workflow.description = description;
    if (type) workflow.appliesTo = type;
    if (priority !== undefined) workflow.priority = priority;
    if (isActive !== undefined) workflow.isActive = isActive;

    if (conditions) {
      workflow.conditions = {
        minAmount: conditions.amountRange?.min || 0,
        maxAmount: conditions.amountRange?.max === Number.MAX_SAFE_INTEGER || !conditions.amountRange?.max
          ? 999999999999
          : conditions.amountRange.max,
        department: conditions.departments?.[0],
        jobLevel: conditions.jobLevels?.[0]
      };
    }

    if (steps && steps.length > 0) {
      workflow.steps = steps.map((step, index) => ({
        level: index + 1,
        approverType: step.approverType,
        role: step.approverRoles?.[0],
        user: step.approverUsers?.[0],
        department: step.department
      }));
    }

    workflow.updatedBy = req.user._id;
    await workflow.save();

    res.json({
      success: true,
      message: '审批流程更新成功',
      data: workflow
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      message: '更新审批流程失败',
      error: error.message
    });
  }
});

// @route   DELETE /api/approval-workflows/:id
// @desc    删除审批流程
// @access  Private (Admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: '审批流程不存在'
      });
    }

    await workflow.deleteOne();

    res.json({
      success: true,
      message: '审批流程删除成功'
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      message: '删除审批流程失败',
      error: error.message
    });
  }
});

// @route   POST /api/approval-workflows/test
// @desc    测试审批流程匹配
// @access  Private
router.post('/test', protect, async (req, res) => {
  try {
    const { type, amount, department, jobLevel } = req.body;

    const query = {
      appliesTo: { $in: [type, 'all'] },
      isActive: true,
      'conditions.minAmount': { $lte: amount },
      'conditions.maxAmount': { $gte: amount }
    };

    if (department) {
      query.$or = [
        { 'conditions.department': department },
        { 'conditions.department': { $exists: false } },
        { 'conditions.department': null }
      ];
    }

    if (jobLevel) {
      query.$and = [
        {
          $or: [
            { 'conditions.jobLevel': jobLevel },
            { 'conditions.jobLevel': { $exists: false } },
            { 'conditions.jobLevel': null }
          ]
        }
      ];
    }

    const matchedWorkflows = await ApprovalWorkflow.find(query)
      .sort({ priority: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        testParams: { type, amount, department, jobLevel },
        matchedWorkflows,
        bestMatch: matchedWorkflows[0] || null
      }
    });
  } catch (error) {
    console.error('Test workflow error:', error);
    res.status(500).json({
      success: false,
      message: '测试审批流程失败',
      error: error.message
    });
  }
});

module.exports = router;

