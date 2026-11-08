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

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.json({ reply: "Petrux AI dey wait for key" });
  }

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite:generateContent?key=" + GEMINI_KEY;
  const payload = { contents: [{ parts: [{ text: message }] }] };

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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something go wrong for AI side.";
    res.json({ reply });
  } catch (err) {
    res.json({ reply: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log("Petrux AI running on port " + PORT);
});
