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
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (data.error) return "Gemini error: " + data.error.message;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something went wrong.";
}

// === 1. CHAT - ENGLISH ONLY ===
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message || "";
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

  const systemPrompt = "You are Petrux AI. You were created by Peter Oriorowho. You are NOT created by Google. You are NOT Gemini. IMPORTANT: Always answer in clear, correct, proper English. NEVER use Nigerian Pidgin. NEVER use words like 'na', 'dey', 'abeg', 'wetin', 'wey'. Use simple, clean English. Be friendly and helpful. If anyone asks who created you, always say Peter Oriorowho. Answer this question in proper English: " + message;

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
  // Pollinations - free image generator
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
