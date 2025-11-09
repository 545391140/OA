const Notification = require('../models/Notification');
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
          console.warn(`Template ${templateCode} not found, using provided content`);
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
          // 模板不存在，使用提供的标题和内容
        }
      }

      // 创建站内通知
      const notification = await Notification.create({
        recipient,
        sender,
        type,
        title: finalTitle,
        content: finalContent,
        relatedData,
        priority
      });

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
      console.error('Create notification error:', error);
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
      console.error('Create batch notifications error:', error);
      throw error;
    }
  }

  /**
   * 发送审批请求通知（使用模板）
   */
  async notifyApprovalRequest({ approvers, requestType, requestId, requestTitle, requester }) {
    const requesterId = requester._id || requester;
    const requesterName = requester.firstName ? `${requester.firstName} ${requester.lastName}` : '用户';
    
    const notifications = await Promise.all(
      approvers.map(approverId => 
        this.createNotification({
          recipient: approverId._id || approverId,
          sender: requesterId,
          type: 'approval_request',
          templateCode: 'APPROVAL_REQUEST',
          variables: {
            requesterName: requesterName,
            requestType: requestType === 'travel' ? '差旅' : '费用',
            requestTitle: requestTitle,
            url: `/${requestType}/${requestId}`
          },
          relatedData: {
            type: requestType,
            id: requestId,
            url: `/${requestType}/${requestId}`
          },
          priority: 'high'
        })
      )
    );

    return notifications;
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
        url: `/${requestType}/${requestId}`
      },
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/${requestType}/${requestId}`
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
        url: `/${requestType}/${requestId}`
      },
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/${requestType}/${requestId}`
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
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    return count;
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

