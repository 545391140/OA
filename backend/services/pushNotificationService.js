const webpush = require('web-push');

// Web Push配置
// 在生产环境中，这些应该从环境变量中读取
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HIeXOFXDvBO7hGgRzUJ0NvzKXqk1lQwVH3JzNvzKXqk1lQwVH3JzNvzKXqk1lQwVH3Jz';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'private_key_here';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

// 初始化Web Push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY !== 'private_key_here') {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const User = require('../models/User');

class PushNotificationService {
  /**
   * 发送推送通知
   */
  async sendPushNotification(userId, { title, body, icon, badge, url, data }) {
    try {
      const user = await User.findById(userId).select('pushSubscription');
      
      if (!user || !user.pushSubscription) {
        console.log(`User ${userId} has no push subscription`);
        return false;
      }

      const payload = JSON.stringify({
        title: title || 'Notification',
        body: body || '',
        icon: icon || '/icon-192x192.png',
        badge: badge || '/icon-192x192.png',
        url: url || '/',
        data: data || {}
      });

      try {
        await webpush.sendNotification(user.pushSubscription, payload);
        console.log(`Push notification sent to user ${userId}`);
        return true;
      } catch (error) {
        console.error(`Failed to send push notification to user ${userId}:`, error);
        
        // 如果订阅已过期，清除订阅
        if (error.statusCode === 410) {
          await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
          console.log(`Removed expired push subscription for user ${userId}`);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Send push notification error:', error);
      return false;
    }
  }

  /**
   * 批量发送推送通知
   */
  async sendBatchPushNotifications(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendPushNotification(userId, notification))
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failCount = results.length - successCount;
    
    return {
      total: userIds.length,
      success: successCount,
      failed: failCount
    };
  }

  /**
   * 保存用户的推送订阅
   */
  async savePushSubscription(userId, subscription) {
    try {
      await User.findByIdAndUpdate(userId, {
        pushSubscription: subscription
      });
      return true;
    } catch (error) {
      console.error('Save push subscription error:', error);
      return false;
    }
  }

  /**
   * 删除用户的推送订阅
   */
  async removePushSubscription(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $unset: { pushSubscription: 1 }
      });
      return true;
    } catch (error) {
      console.error('Remove push subscription error:', error);
      return false;
    }
  }

  /**
   * 获取VAPID公钥（用于前端订阅）
   */
  getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
  }
}

module.exports = new PushNotificationService();




