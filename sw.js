/* 整骨院システムのサービスワーカー（スタッフのスマホへの通知・代表 11/3）
   ・通知（push）には中身を入れていない。届いたら、予約システムに「まだ見ていないお知らせ」を取りに行って表示する
   ・取りに行けなかったときは「新しいお知らせがあります」と出す
   ・通知を押したら、整骨院システム（/app/）を開く。もう開いていたら、その画面を前に出す
   ・ページの読み込み（fetch）には何もしない（今までどおり） */
var CFG = 'hs-push-v1';
var CFG_URL = new URL('__push_cfg', self.registration.scope).href;
var TITLE = '整骨院システム';
var ICON = new URL('apple-touch-icon.png', self.registration.scope).href;
var EXEC_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[\w.-]+\/|macros\/)s\/[\w-]+\/exec$/;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function cfgGet() { return caches.open(CFG).then(function (c) { return c.match(CFG_URL); }).then(function (r) { return r ? r.json() : null; }).catch(function () { return null; }); }
function cfgPut(o) { return caches.open(CFG).then(function (c) { return c.put(CFG_URL, new Response(JSON.stringify(o), {headers: {'Content-Type': 'application/json'}})); }).catch(function () {}); }
function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }
function getJson(url, ms) {
  var ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, ms || 15000) : 0;
  // Apps Script の返事は googleusercontent へ移ってから、Access-Control-Allow-Origin:* で返る
  return fetch(url, {method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'follow', signal: ctl ? ctl.signal : undefined})
    .then(function (r) { clearTimeout(tm); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}

function show(title, body, tag, url, at, quiet) {
  var o = {body: body, tag: tag, icon: ICON, badge: ICON, data: {url: url || ''}, renotify: !quiet, silent: !!quiet};
  if (at) o.timestamp = +at;
  return self.registration.showNotification(title || TITLE, o);
}

function onPush() {
  return cfgGet().then(function (cfg) {
    if (!cfg || !cfg.id || !cfg.k || !EXEC_RE.test(String(cfg.exec || ''))) return show(TITLE, '新しいお知らせがあります', 'hs-new');
    return getJson(cfg.exec + '?' + q({p: 'pushq', i: cfg.id, k: cfg.k, a: cfg.seq || 0, _: Date.now()})).then(function (j) {
      if (j && j.error === 'gone') return show(TITLE, '通知の設定が切れました。整骨院システムを開いて、もう一度「通知をオンにする」を押してください。', 'hs-gone');
      var items = (j && j.items) || [], title = (j && j.title) || TITLE;
      if (j && +j.seq) cfg.seq = Math.max(+cfg.seq || 0, +j.seq);
      if (items.length) cfg.last = {id: items[0].id, body: items[0].body, url: items[0].url, at: items[0].at};
      return cfgPut(cfg).then(function () {
        if (!items.length) {
          // もう前の通知で見せた分（2回続けて届いたとき）：同じ通知を静かに出し直す（iPhoneは、届いたら必ず何か出す決まり）
          if (cfg.last) return show(title, cfg.last.body, 'hs-' + cfg.last.id, cfg.last.url, cfg.last.at, true);
          return show(title, '新しいお知らせがあります', 'hs-new');
        }
        return Promise.all(items.slice(0, 5).reverse().map(function (it) { return show(title, String(it.body || '新しいお知らせがあります'), 'hs-' + it.id, it.url, it.at); }));
      });
    });
  }).catch(function () { return show(TITLE, '新しいお知らせがあります', 'hs-new'); });
}
self.addEventListener('push', function (e) { e.waitUntil(onPush()); });

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var u = (e.notification.data && e.notification.data.url) || '', m = /[?&]d=(\d{4}-\d{2}-\d{2})/.exec(u), day = m ? m[1] : '';
  var scope = self.registration.scope, home = new URL(scope).pathname;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i], p = new URL(c.url).pathname;
      if (p === home || p === home + 'index.html') {
        if (day) { try { c.postMessage({hs: 'goDay', k: day}); } catch (x) {} }
        return c.focus ? c.focus().catch(function () {}) : null;
      }
    }
    return self.clients.openWindow(scope + (day ? '?d=' + day : ''));
  }));
});

/* 端末の通知の登録が新しくなったとき：予約システムに新しい送り先を知らせる */
self.addEventListener('pushsubscriptionchange', function (e) {
  e.waitUntil(cfgGet().then(function (cfg) {
    if (!cfg || !cfg.key || !EXEC_RE.test(String(cfg.exec || ''))) return;
    var s = String(cfg.key).replace(/-/g, '+').replace(/_/g, '/'); s += '===='.slice(s.length % 4 || 4);
    var raw = atob(s), key = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
    return (e.newSubscription ? Promise.resolve(e.newSubscription) : self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key})).then(function (sub) {
      var j = sub.toJSON();
      return getJson(cfg.exec + '?' + q({p: 'pushre', i: cfg.id, k: cfg.k, ep: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth}));
    });
  }).catch(function () {}));
});
