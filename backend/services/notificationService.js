const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const NotificationTemplate = require('../models/NotificationTemplate');
const Settings = require('../models/Settings');
const pushNotificationService = require('./pushNotificationService');

class NotificationService {
  /**
   * 创建通知（支持模板和多种通知渠道）
   */
  async createNotification({ recipient, sender, type, title, content, relatedData, priority = 'normal', templateCode, variables }) {
    try {
      let finalTitle = title;
      let finalContent = content;
      let emailContent = content;
      let pushContent = content;

      // 如果提供了模板代码，使用模板
      if (templateCode) {
        try {
          const template = await NotificationTemplate.getTemplateByCode(templateCode);
          const rendered = template.render(variables || {});
          finalTitle = rendered.title;
          finalContent = rendered.content;
          emailContent = rendered.email;
          pushContent = rendered.push;
        } catch (error) {
          logger.warn(`Template ${templateCode} not found, using provided content or default`);
          // 如果模板不存在，使用默认内容
          if (!finalTitle && type === 'approval_request') {
            finalTitle = variables?.requestType ? `${variables.requestType}审批请求` : '审批请求';
            finalContent = variables?.requesterName && variables?.requestTitle
              ? `${variables.requesterName}提交了${variables.requestType}申请"${variables.requestTitle}"，等待您的审批`
              : '您有新的审批请求';
          }
        }
      } else if (type) {
        // 尝试根据类型查找模板
        try {
          const template = await NotificationTemplate.getTemplateByType(type);
          const rendered = template.render(variables || {});
          finalTitle = rendered.title || title;
          finalContent = rendered.content || content;
          emailContent = rendered.email || content;
          pushContent = rendered.push || content;
        } catch (error) {
          // 模板不存在，使用提供的标题和内容或默认内容
          if (!finalTitle && type === 'approval_request') {
            finalTitle = variables?.requestType ? `${variables.requestType}审批请求` : '审批请求';
            finalContent = variables?.requesterName && variables?.requestTitle
              ? `${variables.requesterName}提交了${variables.requestType}申请"${variables.requestTitle}"，等待您的审批`
              : '您有新的审批请求';
          }
        }
      }

      // 确保标题和内容不为空
      if (!finalTitle) {
        finalTitle = title || '系统通知';
      }
      if (!finalContent) {
        finalContent = content || '您有一条新通知';
      }

      // 创建站内通知
      logger.debug(`Creating notification: recipient=${recipient}, type=${type}, title=${finalTitle}`);
      const notification = await Notification.create({
        recipient,
        sender,
        type,
        title: finalTitle,
        content: finalContent,
        relatedData,
        priority
      });
      logger.debug(`Notification created successfully: ${notification._id}`);

      // 获取用户设置，检查通知偏好
      const userSettings = await Settings.getUserSettings(recipient);
      const systemSettings = await Settings.getSystemSettings();
      
      // 合并设置：用户设置优先
      const emailEnabled = userSettings.notifications.emailNotifications !== false && 
                          systemSettings.notifications.emailNotifications !== false;
      const pushEnabled = userSettings.notifications.pushNotifications !== false && 
                         systemSettings.notifications.pushNotifications !== false;

      // 检查详细通知偏好
      const notificationPrefs = userSettings.notifications?.preferences || systemSettings.notifications?.preferences || {};
      const typePrefs = notificationPrefs[type] || {};
      
      const shouldSendEmail = emailEnabled && (typePrefs.email !== false);
      const shouldSendPush = pushEnabled && (typePrefs.push !== false);

      // 发送邮件通知（如果启用）
      if (shouldSendEmail && emailContent) {
        // TODO: 集成邮件服务
        // await emailService.sendEmail({...});
      }

      // 发送推送通知（如果启用）
      if (shouldSendPush && pushContent) {
        await pushNotificationService.sendPushNotification(recipient, {
          title: finalTitle,
          body: pushContent,
          url: relatedData?.url || '/',
          data: relatedData || {}
        });
      }

      return notification;
    } catch (error) {
      logger.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * 批量创建通知
   */
  async createBatchNotifications(notifications) {
    try {
      const created = await Notification.insertMany(notifications);
      return created;
    } catch (error) {
      logger.error('Create batch notifications error:', error);
      throw error;
    }
  }

  /**
   * 发送审批请求通知（使用模板）
   */
  async notifyApprovalRequest({ approvers, requestType, requestId, requestTitle, requester }) {
    const mongoose = require('mongoose');
    const requesterId = requester._id || requester;
    const requesterName = requester.firstName ? `${requester.firstName} ${requester.lastName}` : '用户';
    
    // 确保 approvers 是数组且包含有效的审批人ID
    if (!approvers || !Array.isArray(approvers) || approvers.length === 0) {
      logger.warn('No approvers provided for approval request notification');
      return [];
    }

    // 过滤并转换审批人ID为ObjectId
    const approverIds = approvers
      .map(approverId => {
        if (!approverId) return null;
        // 如果是对象，取_id；如果是字符串，直接使用
        const id = approverId._id || approverId;
        // 确保是有效的ObjectId格式
        if (mongoose.Types.ObjectId.isValid(id)) {
          return id;
        }
        return null;
      })
      .filter(id => id !== null);

    if (approverIds.length === 0) {
      logger.warn('No valid approver IDs found for approval request notification');
      return [];
    }

    logger.debug(`Sending approval request notifications to ${approverIds.length} approvers`);
    
    const notifications = await Promise.all(
      approverIds.map(async (approverId) => {
        try {
          return await this.createNotification({
            recipient: approverId,
            sender: requesterId,
            type: 'approval_request',
            templateCode: 'APPROVAL_REQUEST',
            variables: {
              requesterName: requesterName,
              requestType: requestType === 'travel' ? '差旅' : '费用',
              requestTitle: requestTitle || '申请',
              url: `/approvals/${requestType}/${requestId}`
            },
            relatedData: {
              type: requestType,
              id: requestId,
              url: `/approvals/${requestType}/${requestId}`
            },
            priority: 'high'
          });
        } catch (error) {
          logger.error(`Failed to create notification for approver ${approverId}:`, error);
          return null;
        }
      })
    );

    // 过滤掉创建失败的通知
    const successfulNotifications = notifications.filter(n => n !== null);
    logger.debug(`Successfully created ${successfulNotifications.length} approval request notifications`);

    return successfulNotifications;
  }

  /**
   * 发送审批通过通知（使用模板）
   */
  async notifyApprovalApproved({ requester, requestType, requestId, requestTitle, approver }) {
    const requesterId = requester._id || requester;
    const approverId = approver._id || approver;
    const approverName = approver.firstName ? `${approver.firstName} ${approver.lastName}` : '审批人';
    
    return await this.createNotification({
      recipient: requesterId,
      sender: approverId,
      type: 'approval_approved',
      templateCode: 'APPROVAL_APPROVED',
      variables: {
        requestType: requestType === 'travel' ? '差旅' : '费用',
        requestTitle: requestTitle,
        approverName: approverName,
        url: `/approvals/${requestType}/${requestId}`
      },
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/approvals/${requestType}/${requestId}`
      },
      priority: 'normal'
    });
  }

  /**
   * 发送审批拒绝通知（使用模板）
   */
  async notifyApprovalRejected({ requester, requestType, requestId, requestTitle, approver, comments }) {
    const requesterId = requester._id || requester;
    const approverId = approver._id || approver;
    const approverName = approver.firstName ? `${approver.firstName} ${approver.lastName}` : '审批人';
    
    return await this.createNotification({
      recipient: requesterId,
      sender: approverId,
      type: 'approval_rejected',
      templateCode: 'APPROVAL_REJECTED',
      variables: {
        requestType: requestType === 'travel' ? '差旅' : '费用',
        requestTitle: requestTitle,
        approverName: approverName,
        comments: comments || '无',
        url: `/approvals/${requestType}/${requestId}`
      },
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/approvals/${requestType}/${requestId}`
      },
      priority: 'high'
    });
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(userId, { page = 1, limit = 20, isRead } = {}) {
    const query = { recipient: userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }

    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query)
    ]);

    return {
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  /**
   * 批量标记为已读
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId) {
    const mongoose = require('mongoose');
    
    // 验证用户ID格式
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // 转换用户ID为ObjectId（如果还不是）
    let userIdObj;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      // 如果已经是 ObjectId 实例，直接使用；否则创建新的 ObjectId
      if (userId instanceof mongoose.Types.ObjectId) {
        userIdObj = userId;
      } else {
        userIdObj = new mongoose.Types.ObjectId(userId);
      }
    } else {
      throw new Error(`Invalid user ID format: ${userId}`);
    }

    try {
      const count = await Notification.countDocuments({
        recipient: userIdObj,
        isRead: false
      });
      return count || 0;
    } catch (error) {
      logger.error('Get unread count error:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });
    return result;
  }
}

module.exports = new NotificationService();

