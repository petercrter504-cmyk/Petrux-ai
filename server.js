import express from 'express'
const app=express()
app.use(express.json())
const K=process.env.GROQ_API_KEY||""
const P=process.env.PORT||3000
const PAYSTACK_KEY="pk_live_0005323d7c6a32424119b099aea2790c6ddb54e6"
const H=`<html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;font-family:Arial;background:#f5f5f5;max-width:480px;margin:auto">
<header style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff;position:sticky;top:0"><div><b>Petrux AI</b><br><small>Created by Peter Oriorowho</small></div><button onclick="openPro()" style="background:#FFD700;border:none;padding:10px 16px;border-radius:20px;font-weight:900">★ PRO</button></header>
<div style="display:flex;gap:6px;padding:10px"><button onclick="showTab('chat')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#00b894;color:#fff;font-weight:900">💬 Chat</button><button onclick="showTab('img')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#6c5ce7;color:#fff;font-weight:900">🎨 Image</button><button onclick="showTab('music')" style="flex:1;padding:10px;border-radius:20px;border:none;background:#e17055;color:#fff;font-weight:900">🎵 Music</button></div>
<div id=tabChat><div id=c style="padding:12px;height:calc(100vh - 300px);overflow:auto"></div></div>
<div id=tabImg style="display:none;padding:12px"><input id=imgP style="width:100%;padding:14px;border-radius:15px;border:1px solid #ddd" placeholder="Describe image... e.g. Lion in Lagos"><button onclick="genImg()" style="width:100%;background:#6c5ce7;color:#fff;border:none;padding:14px;border-radius:20px;margin-top:8px;font-weight:900">Generate Image</button><div id=imgOut style="margin-top:10px"></div></div>
<div id=tabMusic style="display:none;padding:12px"><input id=musP style="width:100%;padding:14px;border-radius:15px;border:1px solid #ddd" placeholder="Describe music... e.g. Afrobeats happy"><button onclick="genMusic()" style="width:100%;background:#e17055;color:#fff;border:none;padding:14px;border-radius:20px;margin-top:8px;font-weight:900">Generate Music</button><button onclick="stopMusic()" style="width:100%;background:#333;color:#fff;border:none;padding:12px;border-radius:20px;margin-top:8px">Stop Music</button><p id=musOut></p></div>
<div style="padding:10px;background:#fff;position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:auto;box-shadow:0 -2px 10px #0002">
<div style="display:flex;gap:8px"><input id=i style="flex:1;padding:14px;border-radius:25px;border:1px solid #ddd;font-size:16px" placeholder="Ask Petrux...">
<button id=micBtn onclick="toggleMic()" style="width:50px;height:50px;border-radius:50%;background:#6c5ce7;color:#fff;border:none;font-size:22px">🎤</button>
<button id=voiceBtn onclick="toggleVoice()" style="width:50px;height:50px;border-radius:50%;background:#00b894;color:#fff;border:none;font-size:22px">🔊</button></div>
<button onclick="s()" style="width:100%;background:#00b894;color:#fff;border:none;padding:14px;border-radius:25px;margin-top:8px;font-weight:900">SEND</button>
<center><small id=proStatus>v31 - Memory + Voice Toggle</small><br><small id=micStatus>Mic: OFF | Voice: ON - Tap 🔊 to turn OFF</small><br><small id=memStatus></small></center></div>
<div id=proModal style="display:none;position:fixed;inset:0;background:#0008;z-index:99;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:20px;padding:20px;width:100%;max-width:380px">
<h2 style="margin:0">👑 Petrux PRO</h2><p>Unlock unlimited</p>
<div onclick="goPay(1000)" style="border:2px solid #00b894;padding:12px;border-radius:12px;margin:8px 0"><b>Weekly - ₦1,000</b></div>
<div onclick="goPay(3000)" style="border:2px solid #FFD700;padding:12px;border-radius:12px;margin:8px 0"><b>Monthly - ₦3,000</b></div>
<div onclick="goPay(25000)" style="border:2px solid #6c5ce7;padding:12px;border-radius:12px;margin:8px 0"><b>Lifetime - ₦25,000</b></div>
<button onclick="closePro()" style="width:100%;padding:12px;border:none;background:#eee;border-radius:20px;margin-top:8px">Close</button></div></div>
<script>
let last="",pro=localStorage.getItem('pro')||'',micOn=false,rec=null,audioCtx=null,musicTimer=null;
let voiceOn=localStorage.getItem('voiceOn')!=='OFF';
let memory=JSON.parse(localStorage.getItem('petrux_memory')||'{}');
let history=JSON.parse(localStorage.getItem('petrux_history')||'[]');
if(pro)document.getElementById('proStatus').innerText='👑 PRO ACTIVE - '+pro;
updateStatus();
function updateStatus(){document.getElementById('micStatus').innerText='Mic: '+(micOn?'ON':'OFF')+' | Voice: '+(voiceOn?'ON - Tap 🔊 to turn OFF':'OFF - Tap 🔊 to turn ON');document.getElementById('voiceBtn').style.background=voiceOn?'#00b894':'#999';document.getElementById('voiceBtn').innerText=voiceOn?'🔊':'🔇';document.getElementById('memStatus').innerText=memory.name?('🧠 Remembering: '+memory.name+(memory.about?' | '+memory.about:'')):'🧠 Memory: Empty - Tell me your name';renderHistory()}
function renderHistory(){let c=document.getElementById('c');c.innerHTML='';history.slice(-20).forEach(h=>{c.innerHTML+='<div style="background:'+(h.role=='user'?'#00b894;color:#fff':'#fff')+';padding:12px;border-radius:15px;margin:8px 0">'+h.text+'</div>'});c.scrollTop=99999}
function saveMemory(q){
let m=q.match(/my name is (.+)/i);if(m){memory.name=m[1].trim();localStorage.setItem('petrux_memory',JSON.stringify(memory))}
let a=q.match(/i (like|love|am|live in|work as) (.+)/i);if(a){memory.about=(memory.about||'')+' '+q;localStorage.setItem('petrux_memory',JSON.stringify(memory))}
}
function showTab(t){document.getElementById('tabChat').style.display=t=='chat'?'block':'none';document.getElementById('tabImg').style.display=t=='img'?'block':'none';document.getElementById('tabMusic').style.display=t=='music'?'block':'none'}
function openPro(){document.getElementById('proModal').style.display='flex'}
function closePro(){document.getElementById('proModal').style.display='none'}
function goPay(p){window.location.href='/pay?amount='+p}
function toggleMic(){
let btn=document.getElementById('micBtn');
if(micOn){micOn=false;if(rec)rec.stop();btn.style.background='#6c5ce7';updateStatus();return}
let R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return alert('Use Chrome');
micOn=true;btn.style.background='red';updateStatus();
rec=new R();rec.lang='en-US';rec.continuous=true;rec.onresult=e=>{document.getElementById('i').value=e.results[e.results.length-1][0].transcript};rec.onend=()=>{if(micOn)rec.start()};rec.start()}
function toggleVoice(){voiceOn=!voiceOn;localStorage.setItem('voiceOn',voiceOn?'ON':'OFF');if(!voiceOn)speechSynthesis.cancel();updateStatus();if(voiceOn)speakLast()}
function genImg(){let p=document.getElementById('imgP').value;if(!p)return alert('Type image description');document.getElementById('imgOut').innerHTML='<p>Generating...</p><img src="https://image.pollinations.ai/prompt/'+encodeURIComponent(p)+'?width=400&height=400&seed='+Date.now()+'" style="width:100%;border-radius:15px">'}
function genMusic(){let p=document.getElementById('musP').value||'Afrobeats';document.getElementById('musOut').innerText='Playing: '+p;if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();stopMusic();let i=0;musicTimer=setInterval(()=>{let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=i%2?'sine':'triangle';o.frequency.value=200+Math.random()*400;g.gain.value=0.15;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.3);i++},300)}
function stopMusic(){if(musicTimer)clearInterval(musicTimer);document.getElementById('musOut').innerText='Music stopped'}
function speakLast(){if(!last||!voiceOn)return;speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(last);u.lang='en-US';speechSynthesis.speak(u)}
async function s(){let q=document.getElementById('i').value;if(!q)return;saveMemory(q);document.getElementById('i').value='';history.push({role:'user',text:q});localStorage.setItem('petrux_history',JSON.stringify(history));renderHistory();let r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,memory:memory,history:history.slice(-10)})});let d=await r.json();last=d.reply.replace(/\\\\\\[|\\\\\\]|\\\\text\\{[^}]*\\}/g,'');history.push({role:'ai',text:last});localStorage.setItem('petrux_history',JSON.stringify(history));renderHistory();if(voiceOn)speakLast();updateStatus()}
</script>`
const PAY=`<html><meta name=viewport content="width=device-width,initial-scale=1"><script src="https://js.paystack.co/v1/inline.js"></script><body style="margin:0;font-family:Arial;background:#f5f5f5;max-width:480px;margin:auto;padding:20px">
<a href="/" style="text-decoration:none">← Back</a><h2>👑 Petrux PRO Checkout</h2><h1 id=amt></h1>
<input id=email style="width:100%;padding:14px;border-radius:12px;border:1px solid #ddd" placeholder="Your email e.g. you@gmail.com">
<button onclick="payNow()" style="width:100%;background:#00b894;color:#fff;border:none;padding:16px;border-radius:20px;margin-top:12px;font-weight:900">Pay Now with Paystack →</button>
<script>
let amt=new URLSearchParams(location.search).get('amount')||'1000';
document.getElementById('amt').innerText='Pay ₦'+Number(amt).toLocaleString();
function payNow(){let email=document.getElementById('email').value;if(!email||!email.includes('@'))return alert('Put your email first');let h=PaystackPop.setup({key:'${PAYSTACK_KEY}',email:email,amount:Number(amt)*100,currency:'NGN',ref:'PETRUX-'+Date.now(),callback:function(r){localStorage.setItem('pro','PRO ₦'+amt);alert('Payment successful! PRO Unlocked!');window.location.href='/'},onClose:function(){alert('Payment cancelled')}});h.openIframe()}
</script>`
app.get('/',(a,b)=>b.send(H))
app.get('/pay',(a,b)=>b.send(PAY))
app.post('/chat',async(a,b)=>{
let q=a.body.message||"",mem=a.body.memory||{},hist=a.body.history||[]
if(!K)return b.json({reply:"Add GROQ_API_KEY"})
let memText=mem.name?("Remember: User name is "+mem.name+". Always use it when they ask 'what is my name'. "+(mem.about||"")):"User has not told their name yet."
for(let m of ["llama-3.3-70b-versatile","openai/gpt-oss-20b"]){
try{
let r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({model:m,messages:[{role:"system",content:"You are Petrux AI, created by Peter Oriorowho. Answer in clear USA English, simple, direct. Plain text only. MEMORY: "+memText+" Never say you don't know the name if memory says it. Use last 10 chats for context."},{role:"user",content:q}]})})
let d=await r.json()
if(d.choices)return b.json({reply:d.choices[0].message.content})
}catch(e){}
}
b.json({reply:"Groq fail"})
})
app.listen(P,()=>console.log("v31 live"))
