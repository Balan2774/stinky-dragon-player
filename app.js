const $=id=>document.getElementById(id), audio=$('audio');
let all=[],visible=[],current=null,group='Campaign 1 · Infinights',playQueue=[];
const date=e=>new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
function render(){
 $('heading').textContent=group;$('chapter').textContent=group.match(/Campaign (\d)/)?.[1].padStart(2,'0')||'✦';
 visible=all.filter(e=>e.group===group&&($('kind').value==='all'||e.kind===$('kind').value)).sort((a,b)=>($('sort').value==='asc'?1:-1)*(Date.parse(a.date)-Date.parse(b.date)));
 $('count').textContent=`${visible.length} episodes · ${$('sort').value==='asc'?'oldest first':'newest first'}`;
 const box=$('episodes');box.replaceChildren();
 if(!visible.length){box.textContent='No episodes in this category. Choose All entries to see everything.';return;}
 visible.forEach((e,index)=>{const row=document.createElement('article');row.className='episode'+(current?.id===e.id?' selected':'');const btn=document.createElement('button');btn.textContent=current?.id===e.id&&!audio.paused?'Ⅱ':'▶';btn.setAttribute('aria-label','Play '+e.title);btn.onclick=()=>{if(current?.id===e.id){if(audio.paused)audio.play().catch(playError);else audio.pause();}else{playQueue=[...visible];play(e);}};const content=document.createElement('div'),title=document.createElement('h3'),meta=document.createElement('div'),n=document.createElement('span');title.textContent=e.title;meta.className='meta';meta.textContent=`${date(e)} · ${e.kind}${e.duration?' · '+e.duration:''}`;n.className='number';n.textContent=String(index+1).padStart(2,'0');content.append(title,meta);const art=artImage(e.artwork,'episode-art');row.append(art,content,btn);box.append(row);});
}
function playError(error){if(error?.name==='AbortError')return;$('status').textContent='Playback could not start. Try the play button; if it still fails, your Patreon audio link may need renewing.';}
function play(e){current=e;$('now-title').textContent=e.title;$('now-meta').textContent=e.group+' · '+date(e);$('status').textContent='';$('player-art').src=e.artwork||'assets/cover.jpg';$('player-art').onerror=()=>{$('player-art').onerror=null;$('player-art').src='assets/cover.jpg'};audio.src=e.audio;audio.playbackRate=Number($('speed').value);audio.play().catch(playError);render();if('mediaSession' in navigator&&typeof MediaMetadata!=='undefined'){navigator.mediaSession.metadata=new MediaMetadata({title:e.title,artist:'Tales from the Stinky Dragon',album:e.group,artwork:[{src:new URL(e.artwork||'assets/cover.jpg',location.href).href}]});}}
function move(n){if(!current)return;const index=playQueue.findIndex(e=>e.id===current.id);const e=playQueue[index+n];if(e)play(e);else $('status').textContent=n>0?'You’ve reached the end of this episode list.':'This is the first episode in the list.';}
audio.onended=()=>move(1);audio.onerror=playError;audio.onplay=()=>{syncPlayer();render()};audio.onpause=()=>{syncPlayer();render()};
$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('back').onclick=()=>{audio.currentTime=Math.max(0,audio.currentTime-15)};$('forward').onclick=()=>{audio.currentTime=Math.min(Number.isFinite(audio.duration)?audio.duration:audio.currentTime+30,audio.currentTime+30)};$('speed').onchange=()=>audio.playbackRate=Number($('speed').value);$('kind').onchange=render;$('sort').onchange=render;

function buildLibrary(data){
 if(!data.length)throw new Error('No playable episodes were found in this file.');
 audio.pause();audio.removeAttribute('src');audio.load();current=null;playQueue=[];
 all=data;const groups=[...new Set(all.map(e=>e.group))].sort((a,b)=>Number(b.startsWith('Campaign'))-Number(a.startsWith('Campaign'))||a.localeCompare(b));
 group=groups.find(g=>g.startsWith('Campaign'))||groups[0];
 $('campaigns').replaceChildren();
 groups.forEach(g=>{const b=document.createElement('button');const cover=all.find(e=>e.group===g&&e.kind==='Story'&&e.artwork)||all.find(e=>e.group===g&&e.artwork);const label=document.createElement('span');label.textContent=g;b.append(artImage(cover?.artwork,''),label);b.classList.toggle('active',g===group);b.onclick=()=>{group=g;$('kind').value=g.startsWith('Campaign')||g.startsWith('Side')||g==='One shots'?'Story':'all';document.querySelectorAll('#campaigns button').forEach(x=>x.classList.toggle('active',x===b));render();};$('campaigns').append(b);});
 $('kind').value=group.startsWith('Campaign')||group.startsWith('Side')||group==='One shots'?'Story':'all';
 $('now-title').textContent='Choose an episode to begin';$('now-meta').textContent='';$('status').textContent='';
 $('empty-library').hidden=true;$('library-tools').hidden=false;render();setView('library');$('import-status').textContent=`Loaded ${all.length} episodes. Your feed stays on this device.`;
}
function groupFor(t){
 const c=t.match(/C0[123]/i)?.[0].toUpperCase();if(c)return {'C01':'Campaign 1 · Infinights','C02':'Campaign 2 · Grotethe','C03':'Campaign 3'}[c];
 if(/Behind The Screen/i.test(t))return 'Behind the Screen';
 if(/\[One Shot\]|Journey To The Center|Apparition of the Aria/i.test(t))return 'One shots';
 for(const key of ['Kyborg Kuest','C-Squad','The Chosen One(s)','Maze Rat Pack','Mealwalkers','Grotethe Death House','Infantnights','Rules of Chaos'])if(t.toLowerCase().includes(key.toLowerCase()))return 'Side adventure · '+key;
 return 'Bonus & other shows';
}
function safeAudio(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function parseFeed(text){
 const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror')||!xml.querySelector('rss channel'))throw new Error('Choose a valid RSS XML file. Save the feed itself, not the Patreon webpage.');
 const data=[];const showArtwork=safeAudio(xml.querySelector('channel > image > url')?.textContent)||safeAudio(xml.querySelector('channel')?.getElementsByTagNameNS('*','image')[0]?.getAttribute('href'));
 for(const item of xml.querySelectorAll('channel > item')){
  const title=item.querySelector('title')?.textContent?.trim()||'Untitled episode',url=safeAudio(item.querySelector('enclosure')?.getAttribute('url'));if(!url)continue;
  const rawDate=item.querySelector('pubDate')?.textContent,ts=Date.parse(rawDate);if(!Number.isFinite(ts))continue;
  const group=groupFor(title),kind=/\[Second Wind\]/i.test(title)?'Second Wind':group.startsWith('Campaign')||group.startsWith('Side')||group==='One shots'?'Story':'Bonus';
  let duration=item.getElementsByTagNameNS('*','duration')[0]?.textContent||'';if(/^\d+$/.test(duration))duration=Math.round(Number(duration)/60)+' min';
  data.push({id:item.querySelector('guid')?.textContent||url,title,date:new Date(ts).toISOString(),audio:url,group,kind,duration,artwork:safeAudio(item.getElementsByTagNameNS('*','image')[0]?.getAttribute('href'))||showArtwork});
 }
 return data;
}
let feedBusy=false;
function setFeedBusy(value){feedBusy=value;$('feed-file').disabled=value;$('import-text').disabled=value;$('forget-feed').disabled=value}
async function importText(text){if(feedBusy)return;setFeedBusy(true);try{if(text.length>20*1024*1024)throw new Error('Choose an RSS file smaller than 20 MB.');const data=parseFeed(text);buildLibrary(data);$('feed-text').value='';try{await feedStore('save',text);$('saved-status').textContent='Saved on this device. Your library will return when you reopen the app.';$('forget-feed').hidden=false;}catch{$('saved-status').textContent='Loaded for this session, but saving failed. Device storage may be unavailable or full. Keep your RSS file to import again.'}}catch(err){$('import-status').textContent=err.message}finally{setFeedBusy(false)}}
$('feed-file').onchange=async()=>{const file=$('feed-file').files[0];if(!file)return;try{if(file.size>20*1024*1024)throw new Error('Choose an RSS file smaller than 20 MB.');await importText(await file.text());}catch(err){$('import-status').textContent=err.message||'Could not read this file. Try selecting it again.'}finally{$('feed-file').value=''}};
$('import-text').onclick=()=>importText($('feed-text').value);
function feedStore(action,text){return new Promise((resolve,reject)=>{let database;const opening=indexedDB.open('stinky-dragon-private-library',1);opening.onupgradeneeded=()=>opening.result.createObjectStore('feeds');opening.onerror=()=>reject(opening.error);opening.onblocked=()=>reject(new Error('Storage is busy'));opening.onsuccess=()=>{database=opening.result;try{const transaction=database.transaction('feeds',action==='read'?'readonly':'readwrite');const store=transaction.objectStore('feeds');const request=action==='read'?store.get('rss'):action==='save'?store.put(text,'rss'):store.delete('rss');transaction.oncomplete=()=>{database.close();resolve(request.result)};transaction.onerror=transaction.onabort=()=>{database.close();reject(transaction.error||new Error('Storage failed'))};}catch(err){database.close();reject(err)}}})}
async function restoreFeed(){setFeedBusy(true);try{const text=await feedStore('read');if(text){$('forget-feed').hidden=false;try{buildLibrary(parseFeed(text));$('saved-status').textContent='Restored your saved feed from this device.'}catch{$('saved-status').textContent='The saved feed could not be read. Import a fresh RSS file or forget the saved feed.'}}}catch{$('saved-status').textContent='Device storage is unavailable. You can still import a feed for this session.'}finally{setFeedBusy(false)}}
$('forget-feed').onclick=async()=>{if(feedBusy)return;setFeedBusy(true);try{await feedStore('forget');audio.pause();audio.removeAttribute('src');audio.load();current=null;all=[];visible=[];playQueue=[];$('campaigns').replaceChildren();$('episodes').replaceChildren();$('empty-library').hidden=false;$('library-tools').hidden=true;$('heading').textContent='Your next adventure';$('count').textContent='Add your RSS feed in Settings to start listening.';$('now-title').textContent='Choose an episode';$('now-meta').textContent='Your next adventure is waiting';$('player-art').src='assets/cover.jpg';$('status').textContent='';$('import-status').textContent='No feed loaded.';$('saved-status').textContent='Saved feed removed from this device.';$('forget-feed').hidden=true;if('mediaSession' in navigator)navigator.mediaSession.metadata=null;syncPlayer();}catch{$('saved-status').textContent='Could not remove the saved feed. Please try again.'}finally{setFeedBusy(false)}};
restoreFeed();

function setView(view){const settings=view==='settings';$('library-view').hidden=settings;$('settings-view').hidden=!settings;for(const name of ['library','settings']){const b=$('tab-'+name);if(name===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}window.scrollTo({top:0,behavior:'instant'});}
$('tab-library').onclick=()=>setView('library');$('tab-settings').onclick=()=>setView('settings');$('open-settings').onclick=()=>setView('settings');
function clockTime(seconds){if(!Number.isFinite(seconds))return '0:00';const n=Math.floor(seconds);return (n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(n>=3600?2:1,'0')+':'+String(n%60).padStart(2,'0')}
function syncPlayer(){$('toggle-play').disabled=!current;$('toggle-play').textContent=audio.paused?'▶':'Ⅱ';$('toggle-play').setAttribute('aria-label',audio.paused?'Play':'Pause');const valid=Number.isFinite(audio.duration)&&audio.duration>0;$('seek').disabled=!valid;$('seek').value=valid?audio.currentTime/audio.duration*100:0;$('elapsed').textContent=clockTime(audio.currentTime);$('total').textContent=clockTime(audio.duration)}
$('toggle-play').onclick=()=>{if(!current)return;if(audio.paused)audio.play().catch(playError);else audio.pause()};audio.ontimeupdate=syncPlayer;audio.onloadedmetadata=syncPlayer;audio.onemptied=syncPlayer;$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number($('seek').value)/100*audio.duration};

function artImage(url,cls){const img=document.createElement('img');img.src=url||'assets/cover.jpg';img.alt='';img.className=cls;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{img.onerror=null;img.src='assets/cover.jpg'};return img}
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install-app').hidden=false;$('install-help').textContent='Install this app to launch it from your home screen.'});
$('install-app').onclick=async()=>{if(!installPrompt)return;const prompt=installPrompt;await prompt.prompt();const choice=await prompt.userChoice;installPrompt=null;$('install-app').hidden=true;$('install-help').textContent=choice.outcome==='accepted'?'Installation requested. Open Listening Room from your home screen.':'You can install later from your browser menu.'};
window.addEventListener('appinstalled',()=>{$('install-app').hidden=true;$('install-help').textContent='Listening Room is installed.'});
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){$('install-help').textContent='You’re using the installed app.'}
if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;$('offline-status').textContent='App support is ready.'}catch{$('offline-status').textContent='App support could not load. You can still listen in your browser.'}})}else $('offline-status').textContent='Use a supported browser to install this app.';
if('mediaSession' in navigator){for(const [action,handler] of Object.entries({play:()=>audio.play().catch(playError),pause:()=>audio.pause(),previoustrack:()=>move(-1),nexttrack:()=>move(1),seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-15),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+30)})){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}}

const playerDialog=$('full-player'),sharedPlayer=document.querySelector('footer.player');
$('open-now-playing').onclick=()=>{if(playerDialog.open)return;$('full-player-body').append(sharedPlayer);document.body.classList.add('player-open');playerDialog.showModal();};
$('close-player').onclick=()=>playerDialog.close();
playerDialog.addEventListener('close',()=>{document.body.insertBefore(sharedPlayer,$('player-anchor'));document.body.classList.remove('player-open');$('open-now-playing').focus();});

