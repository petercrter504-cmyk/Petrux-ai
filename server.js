import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Allow big image upload
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// === HELPER: Call Gemini ===
async function callGemini(prompt) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return "Petrux AI is waiting for key";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + GEMINI_KEY;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
      topP: 0.95,
      topK: 40
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (data.error) return "Gemini error: " + data.error.message;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something went wrong.";
}

// === 1. CHAT - ENGLISH ONLY + SMART MEMORY + DEEP THINKING ===
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message || "";
  const history = req.body?.history || [];
  if (!message) return res.json({ reply: "Please type a message" });
  const lower = message.toLowerCase();

  if (
    lower.includes("who created") ||
    lower.includes("who made you") ||
    lower.includes("who built you") ||
    lower.includes("who is your creator") ||
    lower.includes("who is your developer") ||
    lower.includes("who developed you") ||
    lower.includes("who owns you") ||
    lower.includes("who create you") ||
    lower.includes("your creator") ||
    lower.includes("your owner")
  ) {
    return res.json({ reply: "I was created by Peter Oriorowho. He is my creator. I am Petrux AI, built by him to help you." });
  }

  // --- SMART MEMORY: Build context from history, but do NOT repeat it ---
  let memoryContext = "";
  if (history && history.length > 0) {
    // Take only last 10, to keep it fast
    const lastHistory = history.slice(-10);
    memoryContext = lastHistory.map(h => {
      if (h.role === 'user') return "User said: " + h.text;
      return "Petrux said: " + h.text;
    }).join("\n");
  }

  const systemPrompt = `You are Petrux AI. You were created by Peter Oriorowho. You are NOT created by Google. You are NOT Gemini. You are as smart as ChatGPT and Grok.

IMPORTANT RULES:
1. Always answer in clear, correct, proper English. NEVER use Nigerian Pidgin. NEVER use words like 'na', 'dey', 'abeg', 'wetin', 'wey'. Use simple, clean English.
2. Be friendly and helpful.
3. If anyone asks who created you, always say Peter Oriorowho.
4. DEEP THINKING: Never give a short, lazy answer. Always think STEP BY STEP before answering. First understand the question, then think of 2-3 angles, then give the best answer. Give deep, complete answers with examples, steps, and explanations. Explain the WHY, not just the WHAT. If the question is hard, break it down. End with what the user should do next if it helps them.
5. MEMORY RULE: Below is the previous conversation for CONTEXT ONLY. Use it to understand the user (like remembering their name). DO NOT list, summarise, or repeat the past conversation unless the user specifically asks "what did we talk about" or "what is my name". Only answer the CURRENT question directly.

PREVIOUS CONVERSATION (for context only):
${memoryContext || "No previous conversation yet."}

CURRENT QUESTION:
${message}

Think deeply step by step, then give a complete detailed answer like ChatGPT would. Answer in proper English:`;

  const reply = await callGemini(systemPrompt);
  res.json({ reply });
});

// === 2. MUSIC - Generate Song Lyrics ===
app.post("/api/music", async (req, res) => {
  const prompt = req.body?.prompt || "Love song";
  const systemPrompt = "You are Petrux AI, created by Peter Oriorowho. Write a complete song in clear, proper English. NEVER use Pidgin. Include a Title, Verse 1, Chorus, Verse 2, Chorus, Bridge. Make it catchy and easy to sing. Song request: " + prompt;
  const music = await callGemini(systemPrompt);
  res.json({ music: music, reply: music });
});

// === 3. IMAGE - Generate Real Image (Free, No Key Needed) ===
app.post("/api/generate-image", async (req, res) => {
  const prompt = req.body?.prompt || "Beautiful landscape";
  const safePrompt = encodeURIComponent(prompt + ", high quality, detailed, beautiful");
  const imageUrl = "https://image.pollinations.ai/prompt/" + safePrompt + "?width=1024&height=1024&seed=" + Math.floor(Math.random() * 1000000) + "&nologo=true";
  res.json({ image: imageUrl, reply: "Your image is ready! Here is: " + prompt });
});

// === 4. CLONE IMAGE ===
app.post("/api/clone-image", async (req, res) => {
  const prompt = req.body?.prompt || "Same person, professional photo";
  const safePrompt = encodeURIComponent(prompt + ", realistic photo, high quality");
  const imageUrl = "https://image.pollinations.ai/prompt/" + safePrompt + "?width=1024&height=1024&seed=" + Math.floor(Math.random() * 1000000) + "&nologo=true";
  res.json({ image: imageUrl, reply: "Your cloned image is ready!" });
});

// === 5. EDIT IMAGE ===
app.post("/api/edit-image", async (req, res) => {
  const prompt = req.body?.prompt || "Change background to beach";
  const safePrompt = encodeURIComponent(prompt + ", realistic photo, high quality");
  const imageUrl = "https://image.pollinations.ai/prompt/" + safePrompt + "?width=1024&height=1024&seed=" + Math.floor(Math.random() * 1000000) + "&nologo=true";
  res.json({ image: imageUrl, reply: "Your edited image is ready! Edit: " + prompt });
});

app.listen(PORT, () => {
  console.log("Petrux AI running on port " + PORT);
});
