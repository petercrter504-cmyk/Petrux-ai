import express from 'express'
const app=express()
app.use(express.json())
const K=process.env.GROQ_API_KEY||""
const P=process.env.PORT||3000
const H=`<html><meta name=viewport content="width=device-width,initial-scale=1,maximum-scale=1"><body style="margin:0;font-family:Arial;background:#f5f5f5;max-width:480px;margin:auto">
<header style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff;position:sticky;top:0;z-index:10"><div><b>Petrux AI</b><br><small>Created by Peter Oriorowho</small></div><button onclick="openPro()" style="background:#FFD700;border:none;padding:10px 16px;border-radius:20px;font-weight:900;font-size:15px;cursor:pointer">★ PRO</button></header>
<div id=c style="padding:12px;height:calc(100vh - 190px);overflow:auto"></div>
<div style="padding:10px;background:#fff;position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:auto;box-shadow:0 -2px 10px #0002">
<div style="display:flex;gap:8px"><input id=i style="flex:1;padding:14px;border-radius:25px;border:1px solid #ddd;font-size:16px" placeholder="Ask Petrux...">
<button onclick="voice()" style="width:50px;height:50px;border-radius:50%;background:#6c5ce7;color:#fff;border:none;font-size:22px">🎤</button>
<button onclick="speakLast()" style="width:50px;height:50px;border-radius:50%;background:#00b894;color:#fff;border:none;font-size:22px">🔊</button></div>
<button onclick="s()" style="width:100%;background:#00b894;color:#fff;border:none;padding:14px;border-radius:25px;margin-top:8px;font-weight:900;font-size:16px">SEND</button>
<center><small id=proStatus>v26 - Voice + PRO - Tap 🎤 to talk</small></center></div>
<div id=proModal style="display:none;position:fixed;inset:0;background:#0008;z-index:99;align-items:center;justify-content:center;padding:20px"><div style="background:#fff;border-radius:20px;padding:20px;width:100%;max-width:380px">
<h2 style="margin:0">👑 Petrux PRO</h2><p>Unlock unlimited + Voice USA English</p>
<div onclick="pick(1000)" style="border:2px solid #00b894;padding:12px;border-radius:12px;margin:8px 0"><b>Weekly - ₦1,000</b><br><small>7 days PRO</small></div>
<div onclick="pick(3000)" style="border:2px solid #FFD700;padding:12px;border-radius:12px;margin:8px 0"><b>Monthly - ₦3,000</b><br><small>Best value - 30 days</small></div>
<div onclick="pick(25000)" style="border:2px solid #6c5ce7;padding:12px;border-radius:12px;margin:8px 0"><b>Lifetime - ₦25,000</b><br><small>Pay once, forever</small></div>
<div id=payBox style="background:#f5f5f5;padding:12px;border-radius:12px;display:none"><b id=payText></b><br><small>Send to: Peter Oriorowho<br>Opay: 0703-XXX-XXXX<br>After payment, tap I HAVE PAID</small><br><button onclick="activatePro()" style="background:#00b894;color:#fff;border:none;padding:12px;width:100%;border-radius:20px;margin-top:8px;font-weight:900">I HAVE PAID - UNLOCK PRO</button></div>
<button onclick="closePro()" style="width:100%;padding:12px;border:none;background:#eee;border-radius:20px;margin-top:8px">Close</button></div></div>
<script>
let last="",price=0,pro=localStorage.getItem('pro')||'';
if(pro)document.getElementById('proStatus').innerText='👑 PRO ACTIVE - '+pro;
function openPro(){document.getElementById('proModal').style.display='flex'}
function closePro(){document.getElementById('proModal').style.display='none'}
function pick(p){price=p;document.getElementById('payBox').style.display='block';document.getElementById('payText').innerText='Pay ₦'+p.toLocaleString()+' to unlock PRO'}
function activatePro(){localStorage.setItem('pro','PRO ₦'+price);document.getElementById('proStatus').innerText='👑 PRO ACTIVE - ₦'+price;closePro();alert('PRO Unlocked! Welcome boss!')}
function voice(){let R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return alert('Your browser no support voice, use Chrome');let r=new R();r.lang='en-US';r.onresult=e=>{document.getElementById('i').value=e.results[0][0].transcript;s()};r.start()}
function speakLast(){if(!last)return;let u=new SpeechSynthesisUtterance(last);u.lang='en-US';u.rate=1;u.pitch=1;speechSynthesis.speak(u)}
async function s(){let q=document.getElementById('i').value;if(!q)return;let c=document.getElementById('c');c.innerHTML+='<div style="background:#00b894;color:#fff;padding:12px;border-radius:15px;margin:8px 0">'+q+'</div>';document.getElementById('i').value='';let r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});let d=await r.json();last=d.reply.replace(/\\\\\\[|\\\\\\]|\\\\text\\{[^}]*\\}/g,'');c.innerHTML+='<div style="background:#fff;padding:12px;border-radius:15px;margin:8px 0">'+last.replace(/\\n/g,'<br>')+'<br><button onclick="speakLast()" style="background:#00b894;color:#fff;border:none;padding:8px 14px;border-radius:20px;margin-top:8px">🔊 Listen in USA English</button></div>';c.scrollTop=99999;if(pro)speakLast()}
</script>`
app.get('/',(a,b)=>b.send(H))
app.post('/chat',async(a,b)=>{
let q=a.body.message||""
if(!K)return b.json({reply:"Add GROQ_API_KEY"})
for(let m of ["llama-3.3-70b-versatile","openai/gpt-oss-20b"]){
try{
let r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({model:m,messages:[{role:"system",content:"You are Petrux AI, created by Peter Oriorowho. Answer in clear USA English, simple, direct. Show maths in plain text only. NEVER use LaTeX, \\[ \\], \\text. Use plain like 150 x 100 = 15000."},{role:"user",content:q}]})})
let d=await r.json()
if(d.choices)return b.json({reply:d.choices[0].message.content})
}catch(e){}
}
b.json({reply:"Groq fail, make new key"})
})
app.listen(P,()=>console.log("v26 live"))
