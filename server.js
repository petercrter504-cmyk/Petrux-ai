import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use("/api/", limiter);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ reply: "Type something first." });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Petrux AI, a helpful music generator and Q&A assistant. Be friendly and clear." },
        { role: "user", content: message }
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (e) {
    res.json({ reply: "Sorry, Petrux AI get small error. Try again." });
  }
});

app.post("/api/music", async (req, res) => {
  try {
    const { prompt } = req.body;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music generator. Create song title, lyrics, style, tempo and chords." },
        { role: "user", content: prompt || "Make a happy Afrobeats song" }
      ]
    });
    res.json({ music: completion.choices[0].message.content });
  } catch (e) {
    res.json({ music: "Music generator get error. Try again." });
  }
});

app.post("/api/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.json({ reply: "No image uploaded." });
    const base64 = req.file.buffer.toString("base64");
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: [
          { type: "text", text: "Describe this image and answer any question about it." },
          { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64}` } }
        ]}
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (e) {
    res.json({ reply: "Image error. Try again." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Petrux AI running on " + PORT));
