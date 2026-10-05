const CACHE='stinky-dragon-shell-v9';
const ROOT=new URL('./',self.location.href);
const SHELL=['./','index.html','style.css?v=8','app.js?v=9','manifest.webmanifest','assets/cover.jpg','assets/dragon-icon-180.png','assets/dragon-icon-192.png','assets/dragon-icon-512.png'].map(path=>new URL(path,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('stinky-dragon-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==ROOT.origin)return;
 const navigation=request.mode==='navigate'&&url.pathname===ROOT.pathname;
 if(!navigation&&!SHELL.includes(url.href))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(navigation?ROOT.href:request,copy)))}return response}).catch(()=>caches.open(CACHE).then(cache=>cache.match(navigation?ROOT.href:request))));
});

