import express from 'express';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY || "";

app.get("/", (req, res) => {
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Petrux AI</title><style>body{margin:0;font-family:Arial;background:#f5f5f5}header{display:flex;align-items:center;justify-content:space-between;padding:10px;background:#fff;box-shadow:0 2px 5px #ddd}button#m{font-size:28px;background:#000;color:#fff;border:none;border-radius:10px;padding:8px 14px}#p{background:#FFD700;border:2px solid #000;border-radius:20px;padding:8px 16px;font-weight:900}#chat{padding:12px;padding-bottom:30px;height:calc(100vh - 180px);overflow-y:auto}.msg{max-width:88%;padding:12px;border-radius:18px;margin:8px 0;white-space:pre-wrap;line-height:1.5}.user{background:#00b894;color:#fff;margin-left:auto}.ai{background:#fff}input{width:100%;padding:14px;border-radius:20px;border:1px solid #ddd}#send{width:100%;background:#00b894;color:#fff;border:none;padding:14px;border-radius:20px;font-weight:900;margin-top:8px}</style></head><body><header><button id="m" onclick="document.getElementById('s').style.left='0'">☰</button><div><b>Petrux AI</b><div style="font-size:12px;color:#666">Created by Peter Oriorowho</div></div><button id="p">★ PRO</button></header><div id="s" style="position:fixed;top:0;left:-260px;width:250px;height:100%;background:#fff;padding:20px;box-shadow:2px 0 10px #aaa;z-index:20;transition:0.3s"><h3>Petrux AI</h3><p>New Chat</p><p>History</p><p onclick="document.getElementById('s').style.left='-260px'">Close ✕</p></div><div id="chat"><div class="msg ai">Hi Peter! Ask me anything, I go answer direct.</div></div><div style="padding:10px;background:#fff"><input id="inp" placeholder="Ask Petrux anything..."><button id="send" onclick="sendMsg()">SEND ➤</button></div><script>async function sendMsg(){let i=document.getElementById('inp');let q=i.value.trim();if(!q)return;let c=document.getElementById('chat');c.innerHTML+='<div class="msg user">'+q+'</div>';i.value='';c.scrollTop=c.scrollHeight+100;let r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});let d=await r.json();c.innerHTML+='<div class="msg ai">'+d.reply.replace(/\\n/g,'<br>')+'</div>';c.scrollTop=c.scrollHeight+100;}document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg()})</script><div style="text-align:center;font-size:12px;color:#888">Petrux AI v22 - Fixed ES Module - No Fake Brain</div></body></html>`);
});

app.post("/chat", async (req, res) => {
let q = req.body.message || "";
if(!GROQ_KEY) return res.json({reply:"⚠️ GROQ_API_KEY never dey for Render. Go Render > Environment > Add GROQ_API_KEY from groq.com, then ask me again."});
try{
let r = await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.1-8b-instant",messages:[{role:"system",content:"You are Petrux AI, created by Peter Oriorowho from Owerri, Nigeria. Be smart, direct, simple. Always answer the question fully. Show working for maths."},{role:"user",content:q}]})});
let d = await r.json();
if(d.choices && d.choices[0]) return res.json({reply:d.choices[0].message.content});
return res.json({reply:"Groq error: "+JSON.stringify(d).slice(0,200)+" - Your key fit don expire. Make new one for groq.com"});
}catch(e){ return res.json({reply:"Network error: "+e.message}); }
});

app.listen(PORT, ()=>console.log("Petrux v22 live on "+PORT));
