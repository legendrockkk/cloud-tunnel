/* Cloud Tunnel service worker — sirf app ke page cache hote hain, user ka data kabhi nahi. */
var CACHE = 'cloud-tunnel-v1';
var FILES = ['./', './index.html', './css/style.css', './js/app.js', './manifest.json', './icons/icon.svg'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var url = e.request.url;
  if (url.indexOf('googleapis.com') !== -1 || url.indexOf('google.com') !== -1) return; // Drive hamesha live
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});
