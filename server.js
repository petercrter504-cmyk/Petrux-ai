import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));
app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(path.join(__dirname,'public')));

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const PETER_BIO = `
You are Petrux AI, created by Peter Oriorowho.
ABOUT CREATOR - USE ONLY WHEN ASKED:
- Peter Oriorowho, Stage Name: Petrux, DOB March 31 2005, Age 21, Delta State, Raised Edo State, Nigeria
- Education: Holy Trinity Grammar School, WAEC at Saint Daniel's Secondary School
- Occupation: Musician / World Superstar / Creator
- Story: Peter created Petrux AI by himself to help people write songs, generate images, create content.
RULES: 1. No mention Peter unless user asks who created you / who are you / who is Peter. 2. Normal question - answer direct. 3. Answer in friendly Pidgin + English mix. 4. Never say OpenAI or Meta.
`;

async function askAI(prompt, system){
  let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY;
  let r = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ contents:[{parts:[{text: PETER_BIO + ' ' + system + '\nUser: ' + prompt}]}] })
  });
  let d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, try again';
}

app.post('/api/chat', async (req,res)=>{
  try{ let reply = await askAI(req.body.message, 'Answer directly.'); res.json({reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/music', async (req,res)=>{
  try{ let reply = await askAI('Write full Afrobeats song about: '+req.body.prompt, 'Music writer, Peter Oriorowho style, Verse Chorus Verse 2 Bridge Outro.'); res.json({music:reply, reply}); }
  catch(e){ res.json({error:e.message}); }
});

app.post('/api/generate-image', async (req,res)=>{
  try{
    let p = encodeURIComponent(req.body.prompt);
    let image = 'https://image.pollinations.ai/prompt/' + p + '?width=1024&height=1024&seed=' + Date.now() + '&nologo=true';
    res.json({image, reply:'Your image don ready! 🔥'});
  }catch(e){ res.json({error:e.message}); }
});

app.post('/api/clone-image', async (req,res)=>{
  try{
    let p = encodeURIComponent(req.body.prompt || 'portrait');
    let image = 'https://image.pollinations.ai/prompt/' + p + '?width=1024&height=1024&seed=' + Date.now() + '&nologo=true';
    res.json({image, reply:'Your cloned image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.post('/api/edit-image', async (req,res)=>{
  try{
    let p = encodeURIComponent(req.body.prompt || 'edited photo');
    let image = 'https://image.pollinations.ai/prompt/' + p + '?width=1024&height=1024&seed=' + Date.now() + '&nologo=true';
    res.json({image, reply:'Your edited image don ready!'});
  }catch(e){ res.json({error:e.message}); }
});

app.get('/api/health', (req,res)=>{ res.json({status:'Petrux live free'}); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Petrux live on '+PORT));
