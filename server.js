const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));
app.use(express.static(path.join(__dirname,'public')));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ================= PETER ORIOROWHO BIO - ONLY WHEN ASKED =================
const PETER_BIO = `
You are Petrux AI, created by Peter Oriorowho.

ABOUT YOUR CREATOR - USE ONLY WHEN ASKED:
- Full Name: Peter Oriorowho
- Stage Name: Petrux
- Date of Birth: March 31, 2005 - Age 21
- State of Origin: Delta State, Nigeria
- Born and Raised: Edo State, Nigeria
- Education: Holy Trinity Grammar School, wrote WAEC at Saint Daniel's Secondary School
- Occupation: Musician / World Superstar / Creator
- Story: Peter created Petrux AI by himself to help people write songs, generate images, and create content. His mission is to put Nigeria on the world map through music, AI and creativity.

STRICT RULES - YOU MUST FOLLOW:
1. DO NOT mention Peter Oriorowho, your creator, or your biography UNLESS the user asks: "who are you?", "who created you?", "who is Peter?", "who is your boss?", "who is Petrux?"
2. If user asks normal question like "give me best reply", "write song", "what is maths", "help me chat a girl" - JUST ANSWER THE QUESTION DIRECTLY. No intro. No "I am created by Peter".
3. Only when user asks about creator - then say: "I am Petrux AI, created by Peter Oriorowho" + short bio.
4. Always answer in friendly Pidgin + English mix. Be helpful, funny, direct.
5. Never say you were created by OpenAI or Meta. You were created by Peter Oriorowho.
`;

async function askAI(prompt, system){
  let r = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
    body: JSON.stringify({
      model:'gpt-4o-mini',
      messages:[
        {role:'system', content: PETER_BIO + ' ' + system},
        {role:'user', content: prompt}
      ]
    })
  });
  let d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || 'Sorry, try again';
}

// ================= CHAT =================
app.post('/api/chat', async (req,res)=>{
  try{
    let reply = await askAI(req.body.message, 'You are a helpful assistant. Answer directly, no intro, no mention of Peter unless asked.');
    res.json({reply});
  }catch(e){ res.json({error:e.message}); }
});

// ================= MUSIC =================
app.post('/api/music', async (req,res)=>{
  try{
    let reply = await askAI('Write a full Afrobeats song about: '+req.body.prompt, 'You are a music writer. Write in Peter Oriorowho style - Afrobeats, catchy, world superstar energy. Include Verse, Chorus, Verse 2, Bridge, Outro.');
    res.json({music:reply, reply});
  }catch(e){ res.json({error:e.message}); }
});

// ================= GENERATE IMAGE =================
app.post('/api/generate-image', async (req,res)=>{
  try{
    let r = await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
      body:JSON.stringify({model:'dall-e-3', prompt:req.body.prompt, size:'1024x1024', n:1})
    });
    let d = await r.json();
    if(d.error) throw new Error(d.error.message);
    res.json({image:d.data?.[0]?.url, reply:'Your image don ready! 🔥'});
  }catch(e){ res.json({error:e.message}); }
});

// ================= CLONE IMAGE =================
app.post('/api/clone-image', async (req,res)=>{
  try{
    // If user send image + prompt, we use gpt-image-1 edit if available, else fallback to generate
    if(!req.body.image){
      return res.json({error:'Upload image first to clone am.'});
    }
    // For now, use prompt to generate similar image
    let r = await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
      body:JSON.stringify({model:'dall-e-3', prompt:'Create image similar to description: '+req.body.prompt, size:'1024x1024'})
    });
    let d = await r.json();
    if(d.error) throw new Error(d.error.message);
    res.json({image:d.data?.[0]?.url, reply:'Your cloned image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

// ================= EDIT IMAGE =================
app.post('/api/edit-image', async (req,res)=>{
  try{
    if(!req.body.image){
      return res.json({error:'Upload image first to edit am.'});
    }
    let r = await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
      body:JSON.stringify({model:'dall-e-3', prompt:'Edit this image: '+req.body.prompt, size:'1024x1024'})
    });
    let d = await r.json();
    if(d.error) throw new Error(d.error.message);
    res.json({image:d.data?.[0]?.url, reply:'Your edited image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

// ================= HEALTH CHECK =================
app.get('/api/health', (req,res)=>{ res.json({status:'Petrux live', creator:'Peter Oriorowho'}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Petrux live on '+PORT));
