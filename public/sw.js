/* eslint-disable no-restricted-globals */

// LYNK Service Worker — handles Web Push notifications

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'LYNK', body: event.data.text() }
  }

  const { title = 'LYNK', body = '', icon, data } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data || {},
      vibrate: [100, 50, 100],
      tag: data?.notification_id || undefined,
      renotify: !!data?.notification_id,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/'

  if (data.bet_id) url = `/bet/${data.bet_id}`
  else if (data.group_id) url = `/group/${data.group_id}`
  else if (data.url) url = data.url

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if one is open
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
