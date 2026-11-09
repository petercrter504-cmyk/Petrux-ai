<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#212121">
<title>Petrux AI</title>
<style>
:root{color-scheme:dark;--bg:#212121;--side:#171717;--panel:#2f2f2f;--line:#3d3d3d;--text:#ececec;--muted:#a1a1aa;--green:#10a37f;--hover:#2a2a2a}
*{box-sizing:border-box}html,body{height:100%;margin:0}body{background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
button,input,textarea,select{font:inherit}button{cursor:pointer;color:inherit}
.app{height:100dvh;display:flex;overflow:hidden}
.sidebar{width:260px;flex:0 0 260px;background:var(--side);display:flex;flex-direction:column;padding:12px;transition:transform .2s}
.brandrow{display:flex;align-items:center;justify-content:space-between;padding:5px 4px 18px}
.brand{font-weight:750;font-size:18px;letter-spacing:-.5px}.brand span{color:#b9b9b9}
.iconbtn{border:0;background:transparent;border-radius:9px;padding:9px;color:#c7c7c7}.iconbtn:hover,.sidebtn:hover{background:#292929}
.sidebtn{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:0;border-radius:9px;background:transparent;text-align:left;color:#e6e6e6;font-size:14px}
.sidebtn .ico{width:19px;text-align:center;font-size:17px}
.sideheading{font-size:12px;color:#888;padding:24px 10px 8px}
.chatlist{overflow:auto;flex:1}.chatitem{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;padding:9px 11px;border:0;border-radius:8px;background:transparent;color:#c8c8c8;font-size:13px}.chatitem:hover,.chatitem.active{background:#292929;color:white}
.profile{display:flex;align-items:center;gap:10px;border-top:1px solid #303030;padding:13px 5px 4px;margin-top:10px;font-size:13px}
.avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#356b60;color:white;font-weight:700}
.main{min-width:0;flex:1;display:flex;flex-direction:column;position:relative}
.topbar{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
.mobilemenu{display:none}.modelname{font-weight:650;font-size:16px}.modelname small{font-weight:400;color:#aaa;font-size:12px}
.topright{display:flex;align-items:center;gap:8px}.status{font-size:11px;color:#a5a5a5}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#b28b4d;margin-right:5px}.dot.on{background:#10a37f}
.page{display:none;flex:1;min-height:0;overflow:auto}.page.active{display:flex;flex-direction:column}
.chatarea{flex:1;overflow:auto;padding:20px 20px 30px;scroll-behavior:smooth}
.welcome{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}
.welcome h1{font-size:30px;letter-spacing:-1px;font-weight:600;margin:0 0 22px}.welcome p{color:#aaa;max-width:500px;margin:0}
.messages{max-width:790px;margin:0 auto;display:flex;flex-direction:column;gap:25px}
.message{display:flex;gap:13px;align-items:flex-start}.message.user{justify-content:flex-end}
.message .bubble{max-width:min(100%,690px);white-space:pre-wrap;overflow-wrap:anywhere}
.message.user .bubble{background:#303030;border-radius:20px;padding:11px 17px}
.message.assistant .bubble{padding:2px 0;line-height:1.75}
.message.assistant .avatar{background:#10a37f;flex:0 0 30px}
.message.user .avatar{display:none}
.sources{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}.sources a{color:#9bd9ca;font-size:12px;text-decoration:none;border:1px solid #444;border-radius:20px;padding:4px 9px}
.composerwrap{width:min(790px,calc(100% - 30px));margin:0 auto 16px}
.composer{background:#303030;border:1px solid #454545;border-radius:26px;padding:10px 12px;display:flex;align-items:flex-end;gap:9px;box-shadow:0 4px 22px #0002}
.composer:focus-within{border-color:#666}
#question{flex:1;resize:none;max-height:180px;min-height:34px;border:0;outline:0;background:transparent;color:white;padding:7px 4px;font-size:15px}
#question::placeholder{color:#a0a0a0}
.round{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;display:grid;place-items:center;background:#555;color:white}
.round.send{background:#f4f4f4;color:#171717;font-size:20px;font-weight:700}.round:disabled{opacity:.4}
.toolsrow{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 0;color:#999;font-size:11px;gap:8px}
.toolsrow label{display:flex;align-items:center;gap:6px}.toolsrow input{accent-color:var(--green)}
.disclaimer{text-align:center;color:#888;font-size:11px;padding:0 10px 12px}
.pageinner{width:min(790px,calc(100% - 32px));margin:35px auto;}.pageinner h1{font-size:27px;font-weight:600}.muted{color:#aaa}
.field{margin:18px 0}.field label{display:block;color:#cfcfcf;font-size:13px;margin-bottom:8px}
.field textarea,.field input,.field select{width:100%;background:#303030;border:1px solid #484848;border-radius:13px;padding:13px;color:white;outline:0}
.primary{background:#10a37f;border:0;color:white;border-radius:12px;padding:11px 17px;font-weight:650}.secondary{background:#333;border:1px solid #555;border-radius:12px;padding:10px 15px}
.result{margin-top:18px;padding:16px;background:#2b2b2b;border:1px solid #414141;border-radius:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.result img{max-width:100%;border-radius:10px;display:block}.result audio{width:100%;margin-top:12px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.mobilebackdrop{display:none}
@media(max-width:700px){.sidebar{position:fixed;z-index:20;inset:0 auto 0 0;transform:translateX(-105%);box-shadow:10px 0 40px #0008}.sidebar.open{transform:translateX(0)}.mobilebackdrop.show{display:block;position:fixed;inset:0;background:#0008;z-index:19}.mobilemenu{display:inline-block}.topbar{padding:0 12px}.chatarea{padding:12px 14px 20px}.welcome h1{font-size:25px}.composerwrap{width:calc(100% - 20px);margin-bottom:10px}.toolsrow{font-size:10px}.status{display:none}}
</style>
</head>
<body>
<div class="mobilebackdrop" id="backdrop" onclick="toggleSidebar(false)"></div>
<div class="app">
<aside class="sidebar" id="sidebar">
 <div class="brandrow"><div class="brand">Petrux <span>AI</span></div><button class="iconbtn" onclick="toggleSidebar(false)" aria-label="Close menu">✕</button></div>
 <button class="sidebtn" onclick="newChat()"><span class="ico">＋</span> New chat</button>
 <button class="sidebtn" onclick="showPage('images')"><span class="ico">▧</span> Create image</button>
 <button class="sidebtn" onclick="showPage('songs')"><span class="ico">♫</span> Song Lab</button>
 <button class="sidebtn" onclick="showPage('voice')"><span class="ico">◖))</span> Voice</button>
 <div class="sideheading">Recent chats</div><div class="chatlist" id="chatlist"></div>
 <div class="profile"><div class="avatar">P</div><div><b>Petrux AI</b><div class="muted" style="font-size:11px">Created by Peter Oriorowho</div></div></div>
</aside>
<main class="main">
 <header class="topbar"><div class="row"><button class="iconbtn mobilemenu" onclick="toggleSidebar(true)">☰</button><div class="modelname" onclick="showPage('chat')">Petrux AI <small>⌄</small></div></div><div class="topright"><span class="status"><i class="dot" id="dot"></i><span id="statusText">Connecting…</span></span></div></header>
 <section class="page active" id="chat">
  <div class="chatarea" id="chatarea">
   <div class="welcome" id="welcome"><h1>What can I help with?</h1><p>Ask Petrux anything. Get help with ideas, writing, learning, research and more.</p></div>
   <div class="messages" id="messages"></div>
  </div>
  <div class="composerwrap">
   <div class="composer"><button class="round" title="Create image" onclick="showPage('images')">＋</button><textarea id="question" rows="1" placeholder="Message Petrux AI…" autocomplete="off"></textarea><button class="round send" id="sendBtn" onclick="sendMessage()" aria-label="Send">↑</button></div>
   <div class="toolsrow"><label><input type="checkbox" id="research"> Search the web</label><span id="chatStatus">Petrux can make mistakes. Check important information.</span></div>
  </div>
  <div class="disclaimer">AI-generated responses may be inaccurate. Verify important information.</div>
 </section>
 <section class="page" id="images"><div class="pageinner"><h1>Create an image</h1><p class="muted">Describe what you want Petrux to create.</p><div class="field"><textarea id="imagePrompt" rows="4" placeholder="A beautiful cinematic view of Lagos at sunset…"></textarea></div><button class="primary" id="imageBtn" onclick="createImage()">Generate image</button><div class="result" id="imageResult" style="display:none"></div></div></section>
 <section class="page" id="songs"><div class="pageinner"><h1>Song Lab</h1><p class="muted">Create original lyrics and music ideas.</p><div class="field"><label>Song idea</label><textarea id="songIdea" rows="4" placeholder="A motivational Afrobeats song about rising from nothing…"></textarea></div><div class="row"><div class="field" style="flex:1"><label>Genre</label><select id="genre"><option>Afrobeats</option><option>Afro-fusion</option><option>Hip-hop</option><option>Afro-R&B</option><option>Pop</option><option>Dancehall</option></select></div><div class="field" style="flex:1"><label>Mood</label><select id="mood"><option>Confident</option><option>Emotional</option><option>Romantic</option><option>Motivational</option><option>Joyful</option></select></div></div><button class="primary" id="songBtn" onclick="writeSong()">Write lyrics</button><div class="result" id="songResult" style="display:none"></div><div class="field"><label>Full song prompt (optional)</label><textarea id="musicPrompt" rows="3" placeholder="Describe the beat, instruments and vocal style…"></textarea></div><button class="secondary" id="trackBtn" onclick="makeTrack()">Generate full song</button><div class="result" id="trackResult" style="display:none"></div></div></section>
 <section class="page" id="voice"><div class="pageinner"><h1>Voice studio</h1><p class="muted">Speak your message or listen to Petrux read a reply.</p><div class="field"><textarea id="voiceInput" rows="4" placeholder="Type or dictate your message…"></textarea></div><div class="row"><button class="primary" onclick="askVoice()">Ask Petrux</button><button class="secondary" onclick="startDictation()">🎙 Dictate</button><button class="secondary" onclick="speakLast()">Read answer aloud</button></div><div class="result" id="voiceResult">Your answer will appear here.</div></div></section>
</main></div>
<script>
const $=id=>document.getElementById(id);let history=[];let busy=false;let lastAnswer='';let chats=JSON.parse(localStorage.getItem('petrux_chats')||'[]');let currentChat=Date.now().toString();
function toggleSidebar(open){$('sidebar').classList.toggle('open',open);$('backdrop').classList.toggle('show',open)}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));toggleSidebar(false)}
function saveChats(){localStorage.setItem('petrux_chats',JSON.stringify(chats.slice(-30)));renderChats()}
function renderChats(){$('chatlist').innerHTML='';chats.slice().reverse().forEach(c=>{let b=document.createElement('button');b.className='chatitem'+(c.id===currentChat?' active':'');b.textContent=c.title||'New chat';b.onclick=()=>loadChat(c.id);$('chatlist').append(b)})}
function newChat(){if(history.length){chats.push({id:currentChat,title:history.find(m=>m.role==='user')?.content.slice(0,36)||'New chat',messages:history})}history=[];currentChat=Date.now().toString();$('messages').innerHTML='';$('welcome').style.display='flex';$('chatStatus').textContent='New conversation';saveChats();showPage('chat')}
function loadChat(id){let c=chats.find(x=>x.id===id);if(!c)return;history=c.messages||[];currentChat=id;$('messages').innerHTML='';$('welcome').style.display=history.length?'none':'flex';history.forEach(m=>addMessage(m.role,m.content));renderChats();showPage('chat')}
function addMessage(role,text,sources=[]){$('welcome').style.display='none';let row=document.createElement('div');row.className='message '+role;let av=document.createElement('div');av.className='avatar';av.textContent='P';let bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=text;if(role==='assistant'){row.append(av,bubble)}else row.append(bubble);if(sources.length){let wrap=document.createElement('div');wrap.className='sources';sources.forEach(s=>{let a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||'Source';wrap.append(a)});bubble.append(wrap)}$('messages').append(row);$('chatarea').scrollTop=$('chatarea').scrollHeight;return bubble}
async function sendMessage(){let input=$('question'),text=input.value.trim();if(!text||busy)return;input.value='';input.style.height='auto';history.push({role:'user',content:text});addMessage('user',text);let bubble=addMessage('assistant','Thinking…');busy=true;$('sendBtn').disabled=true;$('chatStatus').textContent='Petrux is thinking…';let answer='',sources=[],done=false;try{let r=await fetch('/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,research:$('research').checked,effort:'medium'})});if(!r.ok){let e={};try{e=await r.json()}catch{}throw new Error(e.error||'Could not connect to Petrux AI')}let reader=r.body.getReader(),decoder=new TextDecoder(),buffer='';while(true){let {value,done:ended}=await reader.read();if(ended)break;buffer+=decoder.decode(value,{stream:true});let frames=buffer.split('\n\n');buffer=frames.pop();for(let frame of frames){let line=frame.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;let ev=JSON.parse(line.slice(6));if(ev.type==='delta'){answer+=ev.text;bubble.textContent=answer;$('chatarea').scrollTop=$('chatarea').scrollHeight}else if(ev.type==='status')$('chatStatus').textContent=ev.message;else if(ev.type==='done'){sources=ev.sources||[];done=true}else if(ev.type==='error')throw new Error(ev.message||'AI error')}}if(!done)throw new Error('Connection ended before the answer finished');if(sources.length){let wrap=document.createElement('div');wrap.className='sources';sources.forEach(s=>{let a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||'Source';wrap.append(a)});bubble.append(wrap)}history.push({role:'assistant',content:answer});lastAnswer=answer;$('chatStatus').textContent='Ready';chats=chats.filter(c=>c.id!==currentChat);chats.push({id:currentChat,title:history.find(m=>m.role==='user')?.content.slice(0,36)||'New chat',messages:history});saveChats()}catch(e){bubble.textContent=answer?answer+'\n\n[Connection issue: '+e.message+']':'I could not get a reply: '+e.message;$('chatStatus').textContent=e.message}finally{busy=false;$('sendBtn').disabled=false}}
$('question').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,180)+'px'});$('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
async function post(url,data){let r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed');return j}
async function createImage(){let prompt=$('imagePrompt').value.trim();if(!prompt)return;let b=$('imageBtn');b.disabled=true;b.textContent='Creating…';$('imageResult').style.display='block';$('imageResult').textContent='Petrux is creating your image…';try{let r=await post('/api/images',{prompt});$('imageResult').innerHTML='';let img=document.createElement('img');img.src=r.image;img.alt='Image generated by Petrux AI';$('imageResult').append(img);let a=document.createElement('a');a.href=r.image;a.download='petrux-ai-image.png';a.textContent='Save image';a.style.display='block';a.style.marginTop='12px';$('imageResult').append(a)}catch(e){$('imageResult').textContent=e.message}finally{b.disabled=false;b.textContent='Generate image'}}
async function writeSong(){let idea=$('songIdea').value.trim();if(!idea)return;let b=$('songBtn');b.disabled=true;b.textContent='Writing…';$('songResult').style.display='block';$('songResult').textContent='Writing your lyrics…';try{let r=await post('/api/song',{idea,genre:$('genre').value,mood:$('mood').value});$('songResult').textContent=r.lyrics;$('musicPrompt').value=$('musicPrompt').value||`${$('genre').value} song, ${$('mood').value} mood. ${idea}. Original melody and polished studio production.`}catch(e){$('songResult').textContent=e.message}finally{b.disabled=false;b.textContent='Write lyrics'}}
async function makeTrack(){let b=$('trackBtn');b.disabled=true;b.textContent='Generating…';$('trackResult').style.display='block';$('trackResult').textContent='Connecting to music service…';try{let r=await fetch('/api/song-audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('musicPrompt').value||$('songIdea').value})});if(!r.ok){let e=await r.json().catch(()=>({}));throw new Error(e.error||'Music generation failed')}let blob=await r.blob(),url=URL.createObjectURL(blob);$('trackResult').innerHTML='';let audio=document.createElement('audio');audio.controls=true;audio.src=url;$('trackResult').append(audio)}catch(e){$('trackResult').textContent=e.message}finally{b.disabled=false;b.textContent='Generate full song'}}
async function askVoice(){let text=$('voiceInput').value.trim();if(!text)return;$('voiceResult').textContent='Petrux is thinking…';try{let r=await post('/api/chat',{messages:[{role:'user',content:text}],effort:'medium'});lastAnswer=r.answer;$('voiceResult').textContent=r.answer}catch(e){$('voiceResult').textContent=e.message}}
function startDictation(){let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('voiceResult').textContent='Speech recognition is not supported by this browser. Try Chrome or type your message.';return}let rec=new SR();rec.lang='en-NG';rec.onresult=e=>$('voiceInput').value=Array.from(e.results).map(x=>x[0].transcript).join(' ');rec.onerror=e=>$('voiceResult').textContent='Microphone error: '+e.error;rec.start()}
function speakLast(){if(!lastAnswer)return;if(!('speechSynthesis'in window))return;let u=new SpeechSynthesisUtterance(lastAnswer);u.lang='en-US';speechSynthesis.cancel();speechSynthesis.speak(u)}
async function checkStatus(){try{let r=await fetch('/api/status');let s=await r.json();$('dot').classList.toggle('on',!!s.ready);$('statusText').textContent=s.ready?'Online':'API key needed'}catch{$('statusText').textContent='Server offline'}}
renderChats();checkStatus();
</script>
</body></html>
