// 🔥 POSODOBLJENO NA v11: GAINWAVE DOMAIN ENFORCER
const CACHE_NAME = 'gainwave-v11'; // Vedno povečamo verzijo za prisilno posodobitev na telefonih

self.addEventListener('install', (event) => {
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 🔥 UNIVERZALNA PUSH LOGIKA (Prisilna Gainwave domena)
self.addEventListener('push', function(event) {
  let data = { 
    title: 'Gainwave Terminal', 
    body: 'Nova posodobitev na trgu.', 
    url: 'https://gain-wave.com' 
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // 🔥 KLJUČNI POPRAVEK: Prisilna zamenjava starega Vercel linka
  let finalUrl = data.url || 'https://gain-wave.com';
  if (finalUrl.includes('vercel.app')) {
    // Če API pošlje npr. ticker-talker.vercel.app/profile, to spremenimo v gain-wave.com/profile
    finalUrl = finalUrl.replace(/.*vercel\.app/, 'https://gain-wave.com');
  } else if (finalUrl.startsWith('/')) {
    // Če je link samo "/view", mu dodamo domeno
    finalUrl = 'https://gain-wave.com' + finalUrl;
  }

  const title = data.title || 'Gainwave';
  const body = data.body || '';
  const icon = '/AppIcon.png';
  
  let vibratePattern = [200, 100, 200];

  // Ekskluzivna vibra za Gainwave Alphe
  if (title.includes('🎯') || title.includes('Signal') || title.includes('Alpha')) {
    vibratePattern = [500, 110, 500, 110, 500, 110, 1000];
  }

  const options = {
    body: body,
    icon: icon,
    badge: icon,
    tag: data.tag || 'gw-notification',
    vibrate: vibratePattern,
    requireInteraction: true, 
    data: {
      url: finalUrl
    },
    actions: [
      { action: 'open', title: 'Odpri Terminal' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  let targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Preiščemo vse odprte zavihke, če je Gainwave že kje odprt
      for (let client of clientList) {
        if (client.url.includes('gain-wave.com') && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // Če ni odprt, odpremo novo okno z našo pravo domeno
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 🔥 Fetch handler (Brez cachiranja za API)
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/supabase') || event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});