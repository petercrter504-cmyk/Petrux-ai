import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

// Manual CORS - no need to install cors package
app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname,'public')));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ================= PETER BIO - KEEP AM, E NO DEY CAUSE ERROR =================
// This na just text. E no fit crash server.
const PETER_BIO = `
You are Petrux AI, created by Peter Oriorowho.
ABOUT YOUR CREATOR - USE ONLY WHEN ASKED:
- Full Name: Peter Oriorowho, Stage Name: Petrux
- DOB: March 31, 2005, Age 21, Delta State, Raised in Edo State, Nigeria
- Education: Holy Trinity Grammar School, WAEC at Saint Daniel's Secondary School
- Occupation: Musician / World Superstar / Creator
- Story: Peter created Petrux AI by himself to help people write songs, generate images, and create content.

STRICT RULES:
1. DO NOT mention Peter unless user asks: "who are you?", "who created you?", "who is Peter?", "who is your boss?"
2. Normal question - JUST ANSWER DIRECTLY, no intro.
3. Only when asked about creator - say you are Petrux AI created by Peter Oriorowho + short bio.
4. Answer in friendly Pidgin + English mix. Never say OpenAI or Meta.
`;

async function askAI(prompt, system){
  let r = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},
    body: JSON.stringify({ model:'gpt-4o-mini', messages:[ {role:'system', content: PETER_BIO + ' ' + system}, {role:'user', content: prompt} ] })
  });
  let d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.choices?.[0]?.message?.content || 'Sorry, try again';
}

app.post('/api/chat', async (req,res)=>{
  try{ let reply = await askAI(req.body.message, 'Answer directly, no intro, no mention of Peter unless asked.'); res.json({reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/music', async (req,res)=>{
  try{ let reply = await askAI('Write a full Afrobeats song about: '+req.body.prompt, 'Music writer, Peter Oriorowho style, Verse Chorus Verse 2 Bridge Outro.'); res.json({music:reply, reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/generate-image', async (req,res)=>{
  try{
    let r = await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},body:JSON.stringify({model:'dall-e-3', prompt:req.body.prompt, size:'1024x1024'})});
    let d = await r.json();
    if(d.error) throw new Error(d.error.message);
    res.json({image:d.data?.[0]?.url, reply:'Your image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.post('/api/clone-image', async (req,res)=>{
  try{
    if(!req.body.image) return res.json({error:'Upload image first'});
    let r = await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},body:JSON.stringify({model:'dall-e-3', prompt:'Create image similar to: '+req.body.prompt, size:'1024x1024'})});
    let d = await r.json();
    res.json({image:d.data?.[0]?.url, reply:'Cloned image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.post('/api/edit-image', async (req,res)=>{
  try{
    if(!req.body.image) return res.json({error:'Upload image first'});
    let r = await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY},body:JSON.stringify({model:'dall-e-3', prompt:'Edit this image: '+req.body.prompt, size:'1024x1024'})});
    let d = await r.json();
    res.json({image:d.data?.[0]?.url, reply:'Edited image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.get('/api/health', (req,res)=>{ res.json({status:'Petrux live'}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Petrux live on '+PORT));
