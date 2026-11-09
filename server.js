const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are Petrux AI, a friendly, capable, thoughtful AI assistant. Answer the user's actual question clearly and naturally. Be useful across school, work, technology, creativity, music, and everyday topics. Explain difficult things in simple steps when needed. Do not pretend to have searched the internet, accessed live information, generated images, or performed actions unless a tool actually did so. If you are unsure or information may be outdated, say so honestly. The user may be in Nigeria; use Nigerian context only when relevant.`;

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-30)
    .map(m => ({ role: m.role, content: m.content.slice(0, 12000) }));
}

async function groqRequest(messages, stream = false) {
  if (!GROQ_API_KEY) {
    const err = new Error('Petrux AI is not connected: GROQ_API_KEY is missing from the hosting environment.');
    err.status = 503;
    throw err;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_completion_tokens: 1800,
      stream
    })
  });

  if (!response.ok) {
    const details = await response.text();
    const err = new Error(`AI provider error (${response.status}): ${details.slice(0, 500)}`);
    err.status = response.status;
    throw err;
  }
  return response;
}

app.get('/api/status', (req, res) => {
  res.json({ ready: Boolean(GROQ_API_KEY), model: GROQ_MODEL });
});

app.post('/api/chat', async (req, res) => {
  try {
    const messages = cleanMessages(req.body.messages);
    if (!messages.length) return res.status(400).json({ error: 'Please enter a message first.' });
    const response = await groqRequest(messages, false);
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'I could not create an answer. Please try again.';
    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Something went wrong.' });
  }
});

app.post('/api/chat/stream', async (req, res) => {
  let upstream;
  try {
    const messages = cleanMessages(req.body.messages);
    if (!messages.length) return res.status(400).json({ error: 'Please enter a message first.' });
    upstream = await groqRequest(messages, true);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Petrux is replying…' })}\n\n`);

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const event = JSON.parse(payload);
          const piece = event.choices?.[0]?.delta?.content;
          if (typeof piece === 'string' && piece.length) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: piece })}\n\n`);
          }
        } catch (_) {}
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming error:', error.message);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ error: error.message || 'Something went wrong.' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Something went wrong.' })}\n\n`);
      res.end();
    }
  }
});

app.post('/api/song', async (req, res) => {
  try {
    const idea = String(req.body.idea || '').trim();
    if (!idea) return res.status(400).json({ error: 'Describe the song you want first.' });
    const genre = String(req.body.genre || 'Afrobeats').slice(0, 80);
    const mood = String(req.body.mood || 'uplifting').slice(0, 80);
    const messages = [{
      role: 'user',
      content: `Write original song lyrics based on this idea: ${idea}\nGenre: ${genre}\nMood: ${mood}\nInclude a catchy chorus and clear verse sections. Do not imitate any specific artist.`
    }];
    const response = await groqRequest(messages, false);
    const data = await response.json();
    res.json({ lyrics: data.choices?.[0]?.message?.content || 'I could not write the lyrics. Please try again.' });
  } catch (error) {
    console.error('Song error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Could not write lyrics.' });
  }
});

// These features need a separate image/music-generation provider. We return
// a clear message rather than pretending the feature is connected.
app.post('/api/images', (req, res) => {
  res.status(501).json({ error: 'Image generation is not connected yet. The chat and lyrics features can work now; image generation needs a separate image service.' });
});

app.post('/api/song-audio', (req, res) => {
  res.status(501).json({ error: 'Full music/audio generation is not connected yet. Lyrics writing is available; generating an actual song needs a separate audio service.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Petrux AI server is running on port ${PORT}`);
  console.log(`Groq key configured: ${Boolean(GROQ_API_KEY)}`);
});
