const $=id=>document.getElementById(id), audio=$('audio');
let all=[],visible=[],current=null,group='Campaign 1 · Infinights',playQueue=[];
const date=e=>new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
function render(){
 $('heading').textContent=group;$('chapter').textContent=group.match(/Campaign (\d)/)?.[1].padStart(2,'0')||'✦';
 visible=all.filter(e=>e.group===group&&($('kind').value==='all'||e.kind===$('kind').value)).sort((a,b)=>($('sort').value==='asc'?1:-1)*(Date.parse(a.date)-Date.parse(b.date)));
 $('count').textContent=`${visible.length} episodes · ${$('sort').value==='asc'?'oldest first':'newest first'}`;
 const box=$('episodes');box.replaceChildren();
 if(!visible.length){box.textContent='No episodes in this category. Choose All entries to see everything.';return;}
 visible.forEach((e,index)=>{const row=document.createElement('article');row.className='episode'+(current?.id===e.id?' selected':'');const btn=document.createElement('button');btn.textContent=current?.id===e.id&&!audio.paused?'Ⅱ':'▶';btn.setAttribute('aria-label','Play '+e.title);btn.onclick=()=>{if(current?.id===e.id){if(audio.paused)audio.play().catch(playError);else audio.pause();}else{playQueue=[...visible];play(e);}};const content=document.createElement('div'),title=document.createElement('h3'),meta=document.createElement('div'),n=document.createElement('span');title.textContent=e.title;meta.className='meta';meta.textContent=`${date(e)} · ${e.kind}${e.duration?' · '+e.duration:''}`;n.className='number';n.textContent=String(index+1).padStart(2,'0');content.append(title,meta);row.append(btn,content,n);box.append(row);});
}
function playError(){$('status').textContent='Playback could not start. Try the play button; if it still fails, your Patreon audio link may need renewing.';}
function play(e){current=e;$('now-title').textContent=e.title;$('now-meta').textContent=e.group+' · '+date(e);$('status').textContent='';audio.src=e.audio;audio.playbackRate=Number($('speed').value);audio.play().catch(playError);render();}
function move(n){if(!current)return;const index=playQueue.findIndex(e=>e.id===current.id);const e=playQueue[index+n];if(e)play(e);else $('status').textContent=n>0?'You’ve reached the end of this episode list.':'This is the first episode in the list.';}
audio.onended=()=>move(1);audio.onerror=playError;audio.onplay=()=>{syncPlayer();render()};audio.onpause=()=>{syncPlayer();render()};
$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('back').onclick=()=>{audio.currentTime=Math.max(0,audio.currentTime-15)};$('forward').onclick=()=>{audio.currentTime=Math.min(Number.isFinite(audio.duration)?audio.duration:audio.currentTime+30,audio.currentTime+30)};$('speed').onchange=()=>audio.playbackRate=Number($('speed').value);$('kind').onchange=render;$('sort').onchange=render;

function buildLibrary(data){
 if(!data.length)throw new Error('No playable episodes were found in this file.');
 audio.pause();audio.removeAttribute('src');audio.load();current=null;playQueue=[];
 all=data;const groups=[...new Set(all.map(e=>e.group))].sort((a,b)=>Number(b.startsWith('Campaign'))-Number(a.startsWith('Campaign'))||a.localeCompare(b));
 group=groups.find(g=>g.startsWith('Campaign'))||groups[0];
 $('campaigns').replaceChildren();
 groups.forEach(g=>{const b=document.createElement('button');b.textContent=g;b.classList.toggle('active',g===group);b.onclick=()=>{group=g;$('kind').value=g.startsWith('Campaign')||g.startsWith('Side')||g==='One shots'?'Story':'all';document.querySelectorAll('#campaigns button').forEach(x=>x.classList.toggle('active',x===b));render();};$('campaigns').append(b);});
 $('kind').value=group.startsWith('Campaign')||group.startsWith('Side')||group==='One shots'?'Story':'all';
 $('now-title').textContent='Choose an episode to begin';$('now-meta').textContent='';$('status').textContent='';
 $('empty-library').hidden=true;$('library-tools').hidden=false;render();setView('library');$('import-status').textContent=`Loaded ${all.length} episodes. Feed contents stay in this browser tab.`;
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
 const data=[];
 for(const item of xml.querySelectorAll('channel > item')){
  const title=item.querySelector('title')?.textContent?.trim()||'Untitled episode',url=safeAudio(item.querySelector('enclosure')?.getAttribute('url'));if(!url)continue;
  const rawDate=item.querySelector('pubDate')?.textContent,ts=Date.parse(rawDate);if(!Number.isFinite(ts))continue;
  const group=groupFor(title),kind=/\[Second Wind\]/i.test(title)?'Second Wind':group.startsWith('Campaign')||group.startsWith('Side')||group==='One shots'?'Story':'Bonus';
  let duration=item.getElementsByTagNameNS('*','duration')[0]?.textContent||'';if(/^\d+$/.test(duration))duration=Math.round(Number(duration)/60)+' min';
  data.push({id:item.querySelector('guid')?.textContent||url,title,date:new Date(ts).toISOString(),audio:url,group,kind,duration});
 }
 return data;
}
function importText(text){try{buildLibrary(parseFeed(text));$('feed-text').value=''}catch(err){$('import-status').textContent=err.message}}
$('feed-file').onchange=async()=>{const file=$('feed-file').files[0];if(!file)return;try{if(file.size>20*1024*1024)throw new Error('Choose an RSS file smaller than 20 MB.');importText(await file.text());}catch{$('import-status').textContent='Could not read this file. Try selecting it again.'}finally{$('feed-file').value=''}};
$('import-text').onclick=()=>importText($('feed-text').value);

function setView(view){const settings=view==='settings';$('library-view').hidden=settings;$('settings-view').hidden=!settings;for(const name of ['library','settings']){const b=$('tab-'+name);if(name===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}window.scrollTo({top:0,behavior:'instant'});}
$('tab-library').onclick=()=>setView('library');$('tab-settings').onclick=()=>setView('settings');$('open-settings').onclick=()=>setView('settings');
function clockTime(seconds){if(!Number.isFinite(seconds))return '0:00';const n=Math.floor(seconds);return (n>=3600?Math.floor(n/3600)+':':'')+String(Math.floor(n/60)%60).padStart(n>=3600?2:1,'0')+':'+String(n%60).padStart(2,'0')}
function syncPlayer(){$('toggle-play').disabled=!current;$('toggle-play').textContent=audio.paused?'▶':'Ⅱ';$('toggle-play').setAttribute('aria-label',audio.paused?'Play':'Pause');const valid=Number.isFinite(audio.duration)&&audio.duration>0;$('seek').disabled=!valid;$('seek').value=valid?audio.currentTime/audio.duration*100:0;$('elapsed').textContent=clockTime(audio.currentTime);$('total').textContent=clockTime(audio.duration)}
$('toggle-play').onclick=()=>{if(!current)return;if(audio.paused)audio.play().catch(playError);else audio.pause()};audio.ontimeupdate=syncPlayer;audio.onloadedmetadata=syncPlayer;audio.onemptied=syncPlayer;$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number($('seek').value)/100*audio.duration};
