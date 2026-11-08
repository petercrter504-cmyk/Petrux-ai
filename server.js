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
  const body = req.body || {};
  const message = body.message;
  if (!message) return res.json({ reply: "Send message na" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.json({ reply: "Petrux AI dey wait for key" });

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  const prompt = "You are Petrux AI. Your creator is Peter Oriorowho. Never say you are Gemini or Google or Meta AI. If someone asks 'Who are you?' you must reply exactly: 'I am Petrux AI, created by Peter Oriorowho' and then continue helping. If someone asks who created you, say Peter Oriorowho created you. Answer in a friendly way. User question: " + message;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (data.error) return res.json({ reply: "Gemini error: " + data.error.message });
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something go wrong for AI side.";
    res.json({ reply });
  } catch (err) {
    res.json({ reply: "Server error: " + err.message });
  }
});

// ===== MUSIC - Lyrics =====
app.post("/api/music", async (req, res) => {
  const prompt = req.body.prompt || req.body.message || "";
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "You are Petrux AI music creator, created by Peter Oriorowho. Write a full song lyrics for: " + prompt + ". Make am catchy, Afrobeats style, with Verse, Chorus, Verse." }] }] }) });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Music fail.";
    res.json({ reply, music: reply });
  } catch(e){ res.json({ reply: "Music error: " + e.message }); }
});

// ===== IMAGE - GENERATE / CLONE / EDIT - ALL IN ONE =====
async function callGeminiImage(promptText, imageBase64) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=" + GEMINI_KEY;
  const parts = [{ text: promptText }];
  if (imageBase64) {
    const clean = imageBase64.split(",")[1] || imageBase64;
    parts.push({ inlineData: { mimeType: "image/png", data: clean } });
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const outParts = data.candidates?.[0]?.content?.parts || [];
  for (let p of outParts) {
    if (p.inlineData) return "data:image/png;base64," + p.inlineData.data;
  }
  throw new Error("Gemini no return image. Try another prompt.");
}

// 1. GENERATE - New image from text
app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.message || "";
    if (!prompt) return res.json({ error: "Type wetin you want make I generate" });
    const image = await callGeminiImage(prompt, null);
    res.json({ image, reply: "✅ Done! Your image don ready." });
  } catch(e){ res.json({ error: e.message }); }
});

// 2. CLONE - Make copy of uploaded image
app.post("/api/clone-image", async (req, res) => {
  try {
    const image = req.body.image;
    const prompt = req.body.prompt || "";
    if (!image) return res.json({ error: "Upload image first to clone" });
    const finalPrompt = "Recreate this image exactly in same style, same person, same background, high quality, realistic. " + prompt;
    const newImage = await callGeminiImage(finalPrompt, image);
    res.json({ image: newImage, reply: "✅ Cloned! I make copy of your image." });
  } catch(e){ res.json({ error: e.message }); }
});

// 3. EDIT - Change uploaded image
app.post("/api/edit-image", async (req, res) => {
  try {
    const image = req.body.image;
    const prompt = req.body.prompt || req.body.message || "";
    if (!image) return res.json({ error: "Upload image first to edit" });
    if (!prompt) return res.json({ error: "Type wetin you want change, e.g. Change shirt to red" });
    const finalPrompt = "Edit this image: " + prompt + ". Keep the same person and background, only change wetin I ask. Make am look real and clean.";
    const newImage = await callGeminiImage(finalPrompt, image);
    res.json({ image: newImage, reply: "✅ Edited! Check your new image." });
  } catch(e){ res.json({ error: e.message }); }
});

// Old /api/image - keep for backward compatibility (Ask about image)
app.post("/api/image", async (req, res) => {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;
  try {
    const q = req.body.question || "What is in this image?";
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "You are Petrux AI, created by Peter Oriorowho. Answer this about image: " + q }] }] }) });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer.";
    res.json({ reply });
  } catch(e){ res.json({ reply: "Error: " + e.message }); }
});

app.listen(PORT, () => {
  console.log("Petrux AI running on port " + PORT);
});
