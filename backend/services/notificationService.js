const Notification = require('../models/Notification');

class NotificationService {
  /**
   * 创建通知
   */
  async createNotification({ recipient, sender, type, title, content, relatedData, priority = 'normal' }) {
    try {
      const notification = await Notification.create({
        recipient,
        sender,
        type,
        title,
        content,
        relatedData,
        priority
      });
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
   * 发送审批请求通知
   */
  async notifyApprovalRequest({ approvers, requestType, requestId, requestTitle, requester }) {
    const notifications = approvers.map(approverId => ({
      recipient: approverId,
      sender: requester,
      type: 'approval_request',
      title: `新的${requestType === 'travel' ? '差旅' : '费用'}审批请求`,
      content: `${requester.firstName} ${requester.lastName} 提交了一个${requestType === 'travel' ? '差旅' : '费用'}申请"${requestTitle}"，请您审批。`,
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/${requestType}/${requestId}`
      },
      priority: 'high'
    }));

    return await this.createBatchNotifications(notifications);
  }

  /**
   * 发送审批通过通知
   */
  async notifyApprovalApproved({ requester, requestType, requestId, requestTitle, approver }) {
    return await this.createNotification({
      recipient: requester,
      sender: approver,
      type: 'approval_approved',
      title: `${requestType === 'travel' ? '差旅' : '费用'}申请已通过`,
      content: `您的${requestType === 'travel' ? '差旅' : '费用'}申请"${requestTitle}"已通过审批。`,
      relatedData: {
        type: requestType,
        id: requestId,
        url: `/${requestType}/${requestId}`
      },
      priority: 'normal'
    });
  }

  /**
   * 发送审批拒绝通知
   */
  async notifyApprovalRejected({ requester, requestType, requestId, requestTitle, approver, comments }) {
    return await this.createNotification({
      recipient: requester,
      sender: approver,
      type: 'approval_rejected',
      title: `${requestType === 'travel' ? '差旅' : '费用'}申请已拒绝`,
      content: `您的${requestType === 'travel' ? '差旅' : '费用'}申请"${requestTitle}"已被拒绝。原因：${comments || '无'}`,
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

