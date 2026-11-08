import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ===== CHAT =====
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;
  if (!message) return res.json({ reply: "Send message na" });
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  const prompt = "You are Petrux AI. Your creator is Peter Oriorowho. Never say you are Gemini or Google or Meta AI. If someone asks 'Who are you?' you must reply exactly: 'I am Petrux AI, created by Peter Oriorowho' and then continue helping. User question: " + message;
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await response.json();
    if (data.error) return res.json({ reply: "Gemini error: " + data.error.message });
    res.json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something go wrong." });
  } catch (err) { res.json({ reply: "Server error: " + err.message }); }
});

// ===== MUSIC =====
app.post("/api/music", async (req, res) => {
  const prompt = req.body.prompt || req.body.message || "";
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "You are Petrux AI music creator, created by Peter Oriorowho. Write full song lyrics for: " + prompt + ". Catchy Afrobeats, Verse, Chorus, Verse." }] }] }) });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Music fail.";
    res.json({ reply, music: reply });
  } catch(e){ res.json({ reply: "Music error: " + e.message }); }
});

// ===== IMAGE - GEMINI FOR CLONE / EDIT =====
async function callGeminiImage(promptText, imageBase64) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=" + GEMINI_KEY;
  const parts = [{ text: promptText }];
  if (imageBase64) {
    const clean = imageBase64.split(",")[1] || imageBase64;
    parts.push({ inlineData: { mimeType: "image/png", data: clean } });
  }
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }) });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const outParts = data.candidates?.[0]?.content?.parts || [];
  for (let p of outParts) { if (p.inlineData) return "data:image/png;base64," + p.inlineData.data; }
  throw new Error("Gemini no return image. Try another prompt.");
}

// 1. GENERATE - FREE, NO QUOTA - Pollinations
app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.message || "";
    if (!prompt) return res.json({ error: "Type wetin you want make I generate" });
    const encoded = encodeURIComponent(prompt + ", high quality, realistic, detailed, 4k");
    const imageUrl = "https://image.pollinations.ai/prompt/" + encoded + "?width=1024&height=1024&seed=" + Math.floor(Math.random()*999999) + "&nologo=true";
    res.json({ image: imageUrl, reply: "✅ Done! Your image don ready." });
  } catch(e){ res.json({ error: e.message }); }
});

// 2. CLONE
app.post("/api/clone-image", async (req, res) => {
  try {
    const image = req.body.image;
    const prompt = req.body.prompt || "";
    if (!image) return res.json({ error: "Upload image first to clone" });
    const newImage = await callGeminiImage("Recreate this image exactly in same style, same person, same background, high quality, realistic. " + prompt, image);
    res.json({ image: newImage, reply: "✅ Cloned!" });
  } catch(e){ res.json({ error: "Clone need Gemini quota. Try Generate instead for now. Error: " + e.message }); }
});

// 3. EDIT
app.post("/api/edit-image", async (req, res) => {
  try {
    const image = req.body.image;
    const prompt = req.body.prompt || req.body.message || "";
    if (!image) return res.json({ error: "Upload image first to edit" });
    if (!prompt) return res.json({ error: "Type wetin you want change" });
    const newImage = await callGeminiImage("Edit this image: " + prompt + ". Keep same person and background, only change wetin I ask. Make am real and clean.", image);
    res.json({ image: newImage, reply: "✅ Edited!" });
  } catch(e){ res.json({ error: "Edit need Gemini quota. Try Generate instead for now. Error: " + e.message }); }
});

app.post("/api/image", async (req, res) => {
  res.json({ reply: "Use Generate / Clone / Edit buttons." });
});

app.listen(PORT, () => { console.log("Petrux AI running on port " + PORT); });
