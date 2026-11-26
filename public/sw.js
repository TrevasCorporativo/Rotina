self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'Modo Sobrevivência',
    body: 'Você tem um lembrete pendente.',
    url: '/',
    tag: 'rotina-reminder',
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/',
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const baseUrl = data.url || '/';

  const u = new URL(baseUrl, self.location.origin);
  if (data.title) u.searchParams.set('rt', data.title);
  if (data.body) u.searchParams.set('rb', data.body);
  const targetUrl = u.pathname + u.search;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
