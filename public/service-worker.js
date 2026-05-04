// 🔥 POSODOBLJENO NA v13: NINJA SYNC & FOREGROUND MUTE 🔥
const CACHE_NAME = 'gainwave-v13-ninja-sync';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Prisilna takojšnja namestitev
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Zbrišemo staro nesnago
          }
        })
      );
    })
  );
  return self.clients.claim(); // Takoj prevzame kontrolo nad vsemi odprtimi zavihki
});

// 🔥 PUSH EVENT S PAMETNIM UTIŠANJEM (FOREGROUND MUTE) 🔥
self.addEventListener('push', function(event) {
  console.log('📡 [NINJA SYNC] Push signal zaznan na telefonu!');

  if (!event.data) {
    console.error('❌ [NINJA SYNC] Prazen signal.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
    console.log('✅ [NINJA SYNC] Podatki prebrani:', data);
  } catch (e) {
    data = { title: "GainWave Terminal", body: event.data.text() };
  }

  // BULLETPROOF URL
  const baseUrl = self.location.origin;
  let targetUrl = data.url ? data.url : '/';
  if (!targetUrl.startsWith('http')) {
     targetUrl = baseUrl + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl);
  }

  // AGRESIVNA LOGIKA
  const isCritical = data.type === 'master_signal' || data.title?.includes('🚨') || data.title?.includes('🎯');
  const vibrationPattern = isCritical ? [500, 200, 500, 200, 1000] : [200, 100, 200];

  const options = {
    body: data.body || 'Nova aktivnost na terminalu.',
    icon: '/AppIcon.png',
    badge: '/AppIcon.png',
    tag: data.type || 'ghost-sync-update',
    renotify: true,
    vibrate: vibrationPattern,
    requireInteraction: isCritical,
    data: { url: targetUrl }
  };

  // 🛑 TUKAJ JE PAMETNA LOGIKA: Preverimo, če aplikacija že teče v ospredju
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      let isAppFocused = false;

      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].focused) {
          isAppFocused = true;
          break;
        }
      }

      if (isAppFocused) {
        console.log('📱 [NINJA SYNC] Aplikacija je odprta v ospredju. Sistemsko obvestilo UTIŠANO.');
        return null; // Aplikacija je odprta, ne prikaži Push okenca!
      } else {
        console.log('🔔 [NINJA SYNC] Aplikacija je v ozadju. Prikazujem obvestilo...');
        return self.registration.showNotification(data.title || 'GainWave Protocol', options);
      }
    }).catch((err) => console.error('❌ [NINJA SYNC] Napaka pri prikazu obvestila:', err))
  );
});

// 🔥 KLIK NA OBVESTILO (Odpre PWA namesto novega zavihka) 🔥
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Najprej zapremo obvestilo
  
  const targetUrl = event.notification.data.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // 1. Poskusi najti že odprt zavihek aplikacije in ga potegni v ospredje
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(targetUrl)); 
        }
      }
      // 2. Če aplikacija sploh ni odprta, jo odpri od nule na pravem linku
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 🔥 FETCH EVENT (Strict Bypass za API in bazo) 🔥
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});