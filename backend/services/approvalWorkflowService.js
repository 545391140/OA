const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const logger = require('../utils/logger');
const User = require('../models/User');

class ApprovalWorkflowService {
  /**
   * 根据条件匹配审批流程
   */
  async matchWorkflow({ type, amount, department, jobLevel }) {
    try {
      // 查找所有启用的工作流，按优先级排序
      const workflows = await ApprovalWorkflow.find({
        type,
        isActive: true
      }).sort({ priority: -1 });

      // 匹配条件
      for (const workflow of workflows) {
        const { conditions } = workflow;
        
        // 检查金额范围
        if (amount < conditions.amountRange.min || amount > conditions.amountRange.max) {
          continue;
        }
        
        // 检查部门（如果指定了部门）
        if (conditions.departments && conditions.departments.length > 0) {
          if (!conditions.departments.includes(department)) {
            continue;
          }
        }
        
        // 检查职位级别（如果指定了职位）
        if (conditions.jobLevels && conditions.jobLevels.length > 0) {
          if (!conditions.jobLevels.includes(jobLevel)) {
            continue;
          }
        }
        
        // 匹配成功
        return workflow;
      }
      
      // 没有匹配的工作流，返回null
      return null;
    } catch (error) {
      logger.error('Match workflow error:', error);
      throw error;
    }
  }

  /**
   * 根据工作流步骤生成审批人列表
   */
  async generateApprovers({ workflow, requesterId, department }) {
    try {
      const approvals = [];
      const requester = await User.findById(requesterId);

      for (const step of workflow.steps) {
        let approverIds = [];

        switch (step.approverType) {
          case 'manager':
            // 直接上级
            if (requester.manager) {
              approverIds.push(requester.manager);
            }
            break;

          case 'specific_user':
            // 指定用户
            approverIds = step.approverUsers || [];
            break;

          case 'role':
            // 按角色查找用户
            if (step.approverRoles && step.approverRoles.length > 0) {
              const users = await User.find({
                role: { $in: step.approverRoles },
                isActive: true
              }).select('_id');
              approverIds = users.map(u => u._id);
            }
            break;

          case 'department_head':
            // 部门负责人（假设部门负责人角色为 'manager'）
            const deptHead = await User.findOne({
              department,
              role: 'manager',
              isActive: true
            }).select('_id');
            if (deptHead) {
              approverIds.push(deptHead._id);
            }
            break;

          case 'finance':
            // 财务人员
            const financeUsers = await User.find({
              role: 'finance',
              isActive: true
            }).select('_id');
            approverIds = financeUsers.map(u => u._id);
            break;

          default:
            break;
        }

        // 如果没有找到审批人且该步骤是必须的，使用管理员
        if (approverIds.length === 0 && step.required) {
          const admin = await User.findOne({ role: 'admin', isActive: true }).select('_id');
          if (admin) {
            approverIds.push(admin._id);
          }
        }

        // 添加审批步骤
        if (approverIds.length > 0) {
          // 根据审批模式处理
          if (step.approvalMode === 'any') {
            // 任一审批即可，添加一个审批记录
            approvals.push({
              approver: approverIds[0], // 取第一个
              level: step.level,
              status: 'pending'
            });
          } else if (step.approvalMode === 'all') {
            // 全部审批，为每个审批人创建记录
            approverIds.forEach(approverId => {
              approvals.push({
                approver: approverId,
                level: step.level,
                status: 'pending'
              });
            });
          } else if (step.approvalMode === 'sequence') {
            // 按顺序审批，只添加第一个
            approvals.push({
              approver: approverIds[0],
              level: step.level,
              status: 'pending'
            });
          }
        }
      }

      return approvals;
    } catch (error) {
      logger.error('Generate approvers error:', error);
      throw error;
    }
  }

  /**
   * 创建默认审批流程
   */
  async createDefaultWorkflows() {
    try {
      // 检查是否已存在默认流程
      const existing = await ApprovalWorkflow.findOne({ name: '默认差旅审批流程' });
      if (existing) {
        logger.debug('Default workflows already exist');
        return;
      }

      const defaultWorkflows = [
        {
          name: '默认差旅审批流程',
          description: '适用于所有差旅申请的默认审批流程',
          type: 'travel',
          conditions: {
            amountRange: {
              min: 0,
              max: 5000
            }
          },
          steps: [
            {
              level: 1,
              name: '直接上级审批',
              approverType: 'manager',
              approvalMode: 'any',
              required: true,
              timeoutHours: 24
            }
          ],
          priority: 1,
          isActive: true
        },
        {
          name: '中等金额差旅审批流程',
          description: '适用于5000-10000元的差旅申请',
          type: 'travel',
          conditions: {
            amountRange: {
              min: 5000,
              max: 10000
            }
          },
          steps: [
            {
              level: 1,
              name: '直接上级审批',
              approverType: 'manager',
              approvalMode: 'any',
              required: true,
              timeoutHours: 24
            },
            {
              level: 2,
              name: '部门负责人审批',
              approverType: 'department_head',
              approvalMode: 'any',
              required: true,
              timeoutHours: 48
            }
          ],
          priority: 2,
          isActive: true
        },
        {
          name: '高金额差旅审批流程',
          description: '适用于超过10000元的差旅申请',
          type: 'travel',
          conditions: {
            amountRange: {
              min: 10000,
              max: Number.MAX_SAFE_INTEGER
            }
          },
          steps: [
            {
              level: 1,
              name: '直接上级审批',
              approverType: 'manager',
              approvalMode: 'any',
              required: true,
              timeoutHours: 24
            },
            {
              level: 2,
              name: '部门负责人审批',
              approverType: 'department_head',
              approvalMode: 'any',
              required: true,
              timeoutHours: 48
            },
            {
              level: 3,
              name: '财务审批',
              approverType: 'finance',
              approvalMode: 'any',
              required: true,
              timeoutHours: 48
            }
          ],
          priority: 3,
          isActive: true
        }
      ];

      await ApprovalWorkflow.insertMany(defaultWorkflows);
      logger.debug('Default workflows created successfully');
    } catch (error) {
      logger.error('Create default workflows error:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalWorkflowService();

