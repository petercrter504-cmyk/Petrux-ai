// Petrux AI - Server - Created by Peter Oriorowho
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(prompt) {
  if (!GEMINI_KEY) return "Petrux is not connected yet. Please add GEMINI_API_KEY in Render.";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return "Sorry, I had a small glitch. Try again.";
    return text;
  } catch (e) {
    console.log(e);
    return "Sorry, network error. Try again.";
  }
}

app.post('/api/chat', async (req, res) => {
  const { message, history, memory } = req.body;
  const userMemory = memory || "Name: Peter Oriorowho. He is the creator of Petrux AI. He likes simple, clear English. He lives in Nekede, Imo State, Nigeria.";
  let memoryContext = "No previous chat.";
  if (history && history.length > 0) {
    memoryContext = history.slice(-10).map(h => `${h.role}: ${h.text}`).join("\n");
  }
  const systemPrompt = `You are Petrux AI. You were created by Peter Oriorowho. You are NOT Gemini. You are NOT Google. Never say you are Gemini or Google. If asked who created you, say Peter Oriorowho.

CRITICAL MEMORY RULE:
You DO remember the user across days, because you have LONG-TERM MEMORY below. NEVER say "I don't remember", "I start with a clean slate", "I don't carry over memories".
If anyone asks "Will you remember tomorrow?" ALWAYS answer: "Yes, I will remember you. I remember you are Peter Oriorowho, my creator, and everything in my Long-Term Memory below."

NEVER invent wife, son, little boy, daughter, family, job, age unless it is in LONG-TERM MEMORY.

Answer in clear, proper English. No Pidgin unless user asks for Pidgin. Be friendly like ChatGPT. Think silently, never show thinking steps. Use bold **like this** for important words.

LONG-TERM MEMORY (TRUSTED - USE THIS ALWAYS):
${userMemory}

PREVIOUS CHAT:
${memoryContext}

CURRENT QUESTION:
${message}

Answer the CURRENT QUESTION using the memory above.`;
  const reply = await callGemini(systemPrompt);
  res.json({ reply });
});

app.post('/api/music', async (req, res) => {
  const { prompt } = req.body;
  const musicPrompt = `You are Petrux AI, a talented songwriter created by Peter Oriorowho. Write a beautiful, complete song about: ${prompt}. Use clear English, catchy chorus, verses and bridge. Make it emotional and easy to sing. Do NOT say you are Gemini.`;
  const music = await callGemini(musicPrompt);
  res.json({ music, reply: music });
});

app.post('/api/generate-image', async (req, res) => {
  const { prompt } = req.body;
  const clean = encodeURIComponent(prompt || "beautiful art");
  const imageUrl = `https://image.pollinations.ai/prompt/${clean}?width=1024&height=1024&seed=${Date.now()}&nologo=true`;
  res.json({ image: imageUrl, reply: `Here is your image for: "${prompt}" 🎨\n\nTap and hold the image to save it!` });
});

app.get('/health', (req, res) => res.json({ status: 'Petrux AI is alive!' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Petrux AI running on port ${PORT}`));
