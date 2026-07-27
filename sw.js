/* 作業報告書 サービスワーカー
   ・HTML（ページ本体）：ネットワーク優先→失敗時キャッシュ（更新がすぐ反映され、オフラインでも開ける）
   ・アイコン等：キャッシュ優先→無ければ取得
   ・バージョンを上げるとき（新しいindex.htmlを上げるとき）は、下のCACHE名の末尾を変える
     → ブラウザが更新を検知し、古いキャッシュを自動で捨てて最新化します
*/
const CACHE = 'sagyou-houkoku-v1_1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // ネットワーク優先（最新を取りに行き、取れたらキャッシュ更新。ダメならキャッシュ）
    e.respondWith(
      fetch(req)
        .then((resp) => { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return resp; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // キャッシュ優先
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((resp) => {
        const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return resp;
      }))
    );
  }
});
