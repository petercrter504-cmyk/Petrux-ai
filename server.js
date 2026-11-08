const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.static(path.join(__dirname,'public')));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// === PETER BIO - ONLY WHEN ASKED ===
const PETER_BIO = `
You are Petrux AI, created by Peter Oriorowho.

ABOUT YOUR CREATOR:
- Full Name: Peter Oriorowho
- Stage Name: Petrux
- DOB: March 31, 2005, Age 21
- From: Delta State, Born and Raised in Edo State, Nigeria
- Education: Holy Trinity Grammar School, WAEC at Saint Daniel's Secondary School
- Occupation: Musician / World Superstar / Creator
- Story: Peter created Petrux AI by himself to help people write songs, generate images, and create content. His mission is to put Nigeria on the world map.

IMPORTANT RULES - READ CAREFULLY:
- DO NOT mention Peter Oriorowho unless user ASKS about him, who created you, who is Peter, who is your boss, who is Petrux.
- If user asks normal question - JUST ANSWER THE QUESTION DIRECTLY. Do NOT introduce yourself. Do NOT say "I am created by Peter".
- Only when user asks "who created you?" or "who are you?" - then say "I am Petrux AI, created by Peter Oriorowho" + short bio.
- Always answer in friendly Pidgin + English mix.
- Never say you were created by OpenAI or Meta.
`;

async function askAI(prompt, system){
  let r = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
    body: JSON.stringify({ model:'gpt-4o-mini', messages:[ {role:'system', content: PETER_BIO + ' ' + system}, {role:'user', content: prompt} ] })
  });
  let d = await r.json();
  return d.choices?.[0]?.message?.content || 'Sorry, try again';
}

app.post('/api/chat', async (req,res)=>{
  try{ let reply = await askAI(req.body.message, 'You are a helpful assistant. Answer directly, no intro.'); res.json({reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/music', async (req,res)=>{
  try{ let reply = await askAI('Write a full Afrobeats song about: '+req.body.prompt, 'You are a music writer. Write in Peter Oriorowho style.'); res.json({music:reply, reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/generate-image', async (req,res)=>{
  try{
    let r = await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},body:JSON.stringify({model:'dall-e-3', prompt:req.body.prompt, size:'1024x1024'})});
    let d = await r.json();
    res.json({image:d.data?.[0]?.url, reply:'Your image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.post('/api/clone-image', async (req,res)=>{ res.json({error:'Clone need image edit model, use Generate for now'}); });
app.post('/api/edit-image', async (req,res)=>{ res.json({error:'Edit need image edit model, use Generate for now'}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Petrux live on '+PORT));
