// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notification', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data || {},
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // 如果已经有打开的窗口，聚焦到该窗口
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 如果没有打开的窗口，打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});










