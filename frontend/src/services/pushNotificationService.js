import apiClient from '../utils/axiosConfig';

class PushNotificationService {
  constructor() {
    this.vapidPublicKey = null;
    this.swRegistration = null;
  }

  /**
   * 初始化推送通知服务
   */
  async initialize() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // 获取VAPID公钥
      const response = await apiClient.get('/push/vapid-key');
      if (response.data.success) {
        this.vapidPublicKey = response.data.data.publicKey;
      }

      // 注册Service Worker
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * 请求推送通知权限
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * 订阅推送通知
   */
  async subscribe() {
    if (!this.swRegistration) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize push notifications');
      }
    }

    try {
      // 请求权限
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permission denied');
      }

      // 创建推送订阅
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // 发送订阅信息到服务器
      const response = await apiClient.post('/push/subscribe', {
        subscription: subscription.toJSON()
      });

      if (response.data.success) {
        console.log('Push notification subscription successful');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * 取消订阅推送通知
   */
  async unsubscribe() {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await apiClient.post('/push/unsubscribe');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * 检查是否已订阅
   */
  async isSubscribed() {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * 将VAPID公钥转换为Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default new PushNotificationService();

