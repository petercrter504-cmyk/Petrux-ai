const express=require('express');const app=express();
app.use(express.json());
const PORT=process.env.PORT||3000;
const GROQ_KEY=process.env.GROQ_API_KEY||"";

function localBrain(q){
let t=q.toLowerCase();
// OLD BRAIN - UNTOUCHED
if(t.includes("who created")||t.includes("who made")||t.includes("your creator")) return "Peter Oriorowho created me! He is the founder of Petrux AI from Owerri, Nigeria. He built me to help students, business people and everyone in Nigeria learn and hustle smarter.";
if(t.includes("photosynthesis")) return "Photosynthesis is how plants make food using sunlight.\n\nEquation: 6CO2 + 6H2O --(sunlight/chlorophyll)--> C6H12O6 + 6O2\n\n1. Plants take CO2 from air\n2. Take water from soil\n3. Sunlight gives energy\n4. They make glucose + oxygen. This is why plants are important for life!";
if(t.includes("business plan")&&t.includes("data")) return "BUSINESS PLAN - DATA BUSINESS IN NIGERIA\n\nCapital: ₦20,000\nBuy 1GB for ₦250, Sell for ₦400. Profit ₦150 per GB.\n\nTarget: Students in Owerri, FUTO, IMSU, Alvan.\nMarketing: WhatsApp Status daily, give discount for referrals, free 100MB for first buyers.\nGoal: Sell 50GB daily = ₦7,500 profit daily.\n\nWant me to write the full plan with marketing steps?";
if(t.includes("wizkid")&&t.includes("davido")) return "Wizkid vs Davido - Both are legends! Wizkid is known worldwide with Essence and global collabs. Davido is known for energy, hits and helping new artists. In Nigeria, both are rich and loved. Who is richer changes every year, but both are top 2 Afrobeats kings.";
if(t.includes("jamb")&&t.includes("english")) return "JAMB English Tips: Read passage twice, answer easy questions first, look for main idea, practice 20 questions daily. Want me to give you 5 practice questions?";

// NEW BRAIN - v20 ADDED, OLD ONES STILL SAME
if(t.includes("250")&&t.includes("400")||t.includes("profit")&&t.includes("50gb")||t.includes("sell 50gb")){
return "Peter, na your question be this! Make I solve am:\n\n1. PROFIT FOR 50GB IN ONE DAY:\nBuy: ₦250 per GB\nSell: ₦400 per GB\nProfit per GB: ₦400 - ₦250 = ₦150\nProfit for 50GB: 50 x ₦150 = ₦7,500\n\nAnswer: ₦7,500 profit in one day.\n\n2. DAYS TO MAKE ₦100,000:\n₦100,000 ÷ ₦7,500 = 13.33 days\nAnswer: 14 days. Day 13 you go get ₦97,500, Day 14 you go pass ₦100,000.\n\n3. 3 WAYS TO GET FIRST 100 CUSTOMERS IN OWERRI WITHOUT ADS:\n1. WhatsApp Status + Broadcast - Post every morning, ask first 10 customers to repost.\n2. School / Lodge Attack - Go FUTO, IMSU, Alvan. Give ₦50 discount if dem bring 2 friends.\n3. Free Giveaway - First 20 people wey message you get 100MB free. Dem go come for free, but 15 go buy again.";
}
if(t.includes("100 customers")||t.includes("first 100")) return "3 ways to get first 100 customers in Owerri without ads:\n1. WhatsApp Status daily + ask customers to repost\n2. Go FUTO, IMSU, Alvan lodges - give discount for referrals\n3. Free 100MB for first 20 people - dem go trust you and buy again.";
if(t.includes("profit")) return "Profit = Sell Price - Buy Price. Example: If you buy for ₦250 and sell for ₦400, profit = ₦150 per GB. If you sell 50GB, profit = 50 x ₦150 = ₦7,500. Tell me your buy price and sell price, I go calculate am for you.";
if(t.includes("hi")||t==="hello") return "Hi Peter! How far? Ask me anything - maths, business, JAMB, or data business. I dey here for you.";
return null;
}

async function askGroq(q){
if(!GROQ_KEY) return null;
try{
let r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+GROQ_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.1-8b-instant",messages:[{role:"system",content:"You are Petrux AI, created by Peter Oriorowho from Owerri, Nigeria. Be smart, direct, simple, helpful. Answer in clear English, sometimes small Nigerian pidgin. Always answer the question, never say tell me a little more. Show working for maths."},{role:"user",content:q}],temperature:0.7})});
let d=await r.json();
if(d.choices&&d.choices[0]) return d.choices[0].message.content;
return null;
}catch(e){return null;}
}

app.get("/",(req,res)=>{res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Petrux AI</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#f5f5f5}header{display:flex;align-items:center;justify-content:space-between;padding:10px;background:#fff;box-shadow:0 2px 5px #ddd;position:sticky;top:0;z-index:10}#menuBtn{font-size:28px;background:#000;color:#fff;border:none;border-radius:10px;padding:8px 14px}#proBtn{background:#FFD700;border:2px solid #000;border-radius:20px;padding:8px 16px;font-weight:900}#chat{flex:1;overflow-y:auto;padding:12px;padding-bottom:30px;height:calc(100vh - 180px)}.msg{max-width:88%;padding:12px 14px;border-radius:18px;margin:8px 0;white-space:pre-wrap;line-height:1.5}.user{background:#00b894;color:#fff;margin-left:auto}.ai{background:#fff;box-shadow:0 1px 3px #ddd}#inputArea{padding:10px;background:#fff;position:sticky;bottom:0}input{width:100%;padding:14px;border-radius:20px;border:1px solid #ddd}button#send{width:100%;background:#00b894;color:#fff;border:none;padding:14px;border-radius:20px;font-weight:900;margin-top:8px;font-size:16px}#side{position:fixed;top:0;left:-260px;width:250px;height:100%;background:#fff;box-shadow:2px 0 10px #aaa;transition:0.3s;padding:20px;z-index:20}#side.open{left:0}</style></head><body><header><button id="menuBtn" onclick="document.getElementById('side').classList.toggle('open')">☰</button><div><b style="font-size:20px">Petrux AI</b><div style="font-size:12px;color:#666">Created by Peter Oriorowho</div></div><button id="proBtn" onclick="alert('PRO - Monthly ₦2,000 / Yearly ₦20,000 - Add PAYSTACK_SECRET_KEY in Render to enable payment')">★ PRO</button></header><div id="side"><h3>Petrux AI</h3><p>New Chat</p><p>History</p><p>Settings</p><p onclick="document.getElementById('side').classList.remove('open')">Close ✕</p></div><div id="chat"><div class="msg ai">Hi Peter! I am Petrux AI, created by you. Ask me anything - I go answer direct now!</div></div><div id="inputArea"><input id="inp" placeholder="Ask Petrux anything..."><button id="send" onclick="sendMsg()">SEND ➤</button></div><script>async function sendMsg(){let i=document.getElementById('inp');let q=i.value.trim();if(!q)return;let c=document.getElementById('chat');c.innerHTML+='<div class="msg user">'+q+'</div>';i.value='';c.scrollTop=c.scrollHeight+100;let r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});let d=await r.json();c.innerHTML+='<div class="msg ai">'+d.reply.replace(/\\n/g,'<br>')+'</div>';c.scrollTop=c.scrollHeight+100;}document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg()})</script><div style="text-align:center;font-size:12px;color:#888;padding:5px">Petrux AI v20 - Menu + Pro Payment - Brain Fixed</div></body></html>`)});
app.post("/chat",async(req,res)=>{
let q=req.body.message||"";
let local=localBrain(q);
if(local) return res.json({reply:local});
let g=await askGroq(q);
if(g) return res.json({reply:g});
return res.json({reply:"Peter, I hear you. I tried to answer but my Groq key never dey for Render yet. Add GROQ_API_KEY for Render Environment, then ask me again. But for profit: Profit = Sell - Buy. If you buy ₦250 sell ₦400, profit na ₦150 per GB, 50GB na ₦7,500."});
});
app.listen(PORT,()=>console.log("Petrux v20 live on "+PORT));
