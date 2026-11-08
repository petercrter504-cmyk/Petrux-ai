import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  const body = req.body || {};
  const message = body.message;
  if (!message) return res.json({ reply: "Send message na" });

  const lower = message.toLowerCase();

  // === LOCK CREATOR NAME - IN ENGLISH ===
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

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.json({ reply: "Petrux AI is waiting for key" });
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + GEMINI_KEY;

  // === ENGLISH ONLY - NO PIDGIN ===
  const systemPrompt = "You are Petrux AI. You were created by Peter Oriorowho. You are NOT created by Google. You are NOT Gemini. IMPORTANT RULE: Always answer in clear, correct, proper English. NEVER use Nigerian Pidgin. NEVER use words like 'na', 'dey', 'abeg', 'wetin', 'wey', 'make I tell you'. Use simple, clean English that anyone can understand. Be friendly, helpful and clear. If anyone asks who created you, always say Peter Oriorowho. Answer this question in proper English: " + message;

  const payload = { contents: [{ parts: [{ text: systemPrompt }] }] };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.error) {
      return res.json({ reply: "Gemini error: " + data.error.message });
    }
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something went wrong.";
    if (reply.toLowerCase().includes("created by google")) {
      reply = "I was created by Peter Oriorowho. He is my creator.";
    }
    res.json({ reply });
  } catch (err) {
    res.json({ reply: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log("Petrux AI running on port " + PORT);
});
