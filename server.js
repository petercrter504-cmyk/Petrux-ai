import express from 'express'
const app=express()
app.use(express.json())
const K=process.env.GROQ_API_KEY||""
const P=process.env.PORT||3000
const H=`<html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;font-family:Arial;background:#f5f5f5"><header style="display:flex;justify-content:space-between;padding:10px;background:#fff"><b>Petrux AI<br><small>Created by Peter Oriorowho</small></b><b style="background:#FFD700;padding:8px;border-radius:20px">★ PRO</b></header><div id=c style="padding:12px;height:70vh;overflow:auto"></div><div style="padding:10px;background:#fff"><input id=i style="width:100%;padding:12px;border-radius:20px"><button onclick=s() style="width:100%;background:#00b894;color:#fff;border:none;padding:12px;border-radius:20px;margin-top:8px;font-weight:900">SEND</button></div><script>async function s(){let q=document.getElementById('i').value;if(!q)return;let c=document.getElementById('c');c.innerHTML+='<div style="background:#00b894;color:#fff;padding:10px;border-radius:15px;margin:8px 0">'+q+'</div>';document.getElementById('i').value='';let r=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});let d=await r.json();c.innerHTML+='<div style="background:#fff;padding:10px;border-radius:15px;margin:8px 0">'+d.reply.replace(/\\n/g,'<br>')+'</div>'}</script><center><small>v24 - One File</small></center>`
app.get('/',(a,b)=>b.send(H))
app.post('/chat',async(a,b)=>{
let q=a.body.message||""
if(!K)return b.json({reply:"Add GROQ_API_KEY for Render"})
for(let m of ["llama-3.3-70b-versatile","openai/gpt-oss-20b"]){
try{
let r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({model:m,messages:[{role:"system",content:"You are Petrux AI, created by Peter Oriorowho. Answer direct, simple, show maths working."},{role:"user",content:q}]})})
let d=await r.json()
if(d.choices)return b.json({reply:d.choices[0].message.content})
}catch(e){}
}
b.json({reply:"Groq fail, make new key for groq.com"})
})
app.listen(P,()=>console.log("v24 live"))
