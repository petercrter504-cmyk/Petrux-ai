import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
const GROQ_KEY = process.env.GROQ_API_KEY || "";
app.post('/api/chat', async (req,res)=>{
try{
const userMsg = req.body.message || "";
if(!GROQ_KEY){ return res.json({reply:""}); }
const controller = new AbortController();
setTimeout(()=>controller.abort(), 15000);
const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
method:'POST',
headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_KEY},
body: JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'system',content:'You are Petrux AI, created by Peter Oriorowho. Friendly, smart, funny, human-like. Speak clean correct USA English. Give direct real answer FIRST, then explain simply. Never say Great question about. Never say As an AI.'},{role:'user',content:userMsg}],temperature:0.7,max_tokens:800}),
signal: controller.signal
});
const data = await r.json();
res.json({reply: data?.choices?.[0]?.message?.content || ""});
}catch(e){ res.json({reply:""}); }
});
app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Petrux AI</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Arial}body{background:#fff;display:flex;flex-direction:column;height:100dvh}header{padding:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee}header h1{font-size:18px}#chat{flex:1;overflow-y:auto;padding:14px;max-width:760px;width:100%;margin:0 auto}.msg{max-width:92%;padding:12px 14px;border-radius:16px;margin-bottom:12px;line-height:1.6;font-size:15px;white-space:pre-wrap;word-break:break-word}.user{background:#10a37f;color:#fff;margin-left:auto}.ai{background:#f7f7f8;margin-right:auto}.qbtn{padding:10px 14px;border-radius:20px;border:1px solid #ddd;background:#fff;font-size:14px;margin:4px}#inputArea{padding:10px;max-width:760px;width:100%;margin:0 auto;border-top:1px solid #eee}#inputBox{display:flex;gap:8px}#input{flex:1;border:1px solid #ddd;padding:13px;border-radius:30px;font-size:15px;outline:none}#sendBtn{background:#00a884;color:#fff;border:none;width:50px;height:50px;border-radius:50%;font-size:18px}</style></head><body><header><div><h1>Petrux AI</h1><p style="font-size:12px;color:#888">Created by Peter Oriorowho</p></div><div><b style="background:#FFD700;padding:8px 12px;border-radius:20px">⭐ Pro</b></div></header><div id="chat"><div id="welcome" style="text-align:center;margin-top:20px"><h2>What can I help with?</h2><p style="color:#888;margin-top:8px">Now smarter - Ask anything!</p><div style="margin-top:14px"><button class="qbtn" onclick="quickAsk('Between Wizkid and Davido who is richer?')">Wizkid vs Davido?</button><button class="qbtn" onclick="quickAsk('Explain photosynthesis for JAMB')">Photosynthesis for JAMB</button><br><button class="qbtn" onclick="quickAsk('Write a business plan for selling data in Nigeria')">Business Plan</button></div></div></div><div id="inputArea"><div id="inputBox"><input id="input" placeholder="Ask Petrux anything..."><button id="sendBtn" onclick="sendMsg()">➤</button></div><p style="font-size:12px;color:#888;text-align:center;margin-top:6px">Petrux AI v13 FIXED</p></div><script>
function addMsg(role,text){var w=document.getElementById('welcome');if(w)w.remove();var c=document.getElementById('chat');var d=document.createElement('div');d.className='msg '+role;d.textContent=text;c.appendChild(d);c.scrollTop=c.scrollHeight;}
function quickAsk(q){document.getElementById('input').value=q;sendMsg();}
function sendMsg(){var i=document.getElementById('input');var t=i.value.trim();if(!t)return;addMsg('user',t);i.value='';callAI(t);}
async function callAI(text){var c=document.getElementById('chat');var typing=document.createElement('div');typing.className='msg ai';typing.id='typing';typing.textContent='Petrux is thinking...';c.appendChild(typing);c.scrollTop=c.scrollHeight;try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});var j=await r.json();var tp=document.getElementById('typing');if(tp)tp.remove();if(j.reply&&j.reply.length>10){addMsg('ai',j.reply);}else{addMsg('ai','I hear you! You asked about: '+text+'. Tell me a little more - is it for school, JAMB, business, or just for fun?');}}catch(e){var tp2=document.getElementById('typing');if(tp2)tp2.remove();addMsg('ai','Sorry, network blinked! Try again.');}}
document.getElementById('input').addEventListener('keypress',function(e){if(e.key==='Enter')sendMsg();});
<\/script></body></html>`);
});
app.listen(PORT,()=>console.log('Petrux running '+PORT));
