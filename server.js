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
  const { message } = req.body || {};
  if (!message) return res.json({ reply: "Send message na" });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return res.json({ reply: "Petrux AI dey wait for key" });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await response.json();
    console.log("GEMINI STATUS:", response.status);
    console.log("GEMINI RESPONSE:", JSON.stringify(data).slice(0, 1000));
    if (data.error) {
      return res.json({ reply: "Gemini error: " + data.error.message });
    }
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, something go wrong for AI side.";
    res.json({ reply });
  } catch (err) {
    console.log("SERVER ERROR:", err.message);
    res.json({ reply: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log("Petrux AI running on port " + PORT);
}); + PORT);
});
