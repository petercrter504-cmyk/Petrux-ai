const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are Petrux AI, a friendly, intelligent and capable AI assistant.

Your job is to answer questions naturally and accurately.

You have access to live internet browser search through Groq.

INTERNET SEARCH RULES:

1. Search the internet when users ask about current events, recent news, latest developments, current prices, sports results, or information that may have changed.
2. Use internet search when the user explicitly asks you to search the web.
3. For ordinary questions that do not require current information, answer directly.
4. Never pretend to have searched when you have not.
5. When search results are available, use them to produce accurate answers.
6. Include relevant source citations when available.
7. Be honest when information cannot be verified.

OTHER CAPABILITIES:

- Explain difficult topics simply.
- Help with education, technology, business and everyday questions.
- Help users write original music and lyrics.
- Be friendly and conversational.
- Use Nigerian context when relevant.
- Never invent facts or claim to have performed actions you did not perform.

You are Petrux AI.`;

function cleanMessages(messages) {
if (!Array.isArray(messages)) return [];

return messages
.filter(m =>
m &&
['user', 'assistant'].includes(m.role) &&
typeof m.content === 'string'
)
.slice(-30)
.map(m => ({
role: m.role,
content: m.content.slice(0, 12000)
}));
}

async function groqRequest(messages, stream = false) {

if (!GROQ_API_KEY) {
const err = new Error(
'GROQ_API_KEY is missing from the hosting environment.'
);
err.status = 503;
throw err;
}

const supportsBrowserSearch = [
'openai/gpt-oss-20b',
'openai/gpt-oss-120b'
].includes(GROQ_MODEL);

const requestBody = {
model: GROQ_MODEL,

messages: [
  { role: 'system', content: SYSTEM_PROMPT },
  ...messages
],

temperature: 0.7,
max_completion_tokens: 1800,
stream

};

if (supportsBrowserSearch) {
requestBody.tools = [
{ type: 'browser_search' }
];
}

const response = await fetch(
'https://api.groq.com/openai/v1/chat/completions',
{
method: 'POST',

  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },

  body: JSON.stringify(requestBody)
}

);

if (!response.ok) {
const details = await response.text();

const err = new Error(
  `AI provider error (${response.status}): ${details.slice(0, 500)}`
);

err.status = response.status;
throw err;

}

return response;
}

app.get('/api/status', (req, res) => {

res.json({
ready: Boolean(GROQ_API_KEY),
model: GROQ_MODEL,
internetSearch: Boolean(GROQ_API_KEY) &&
['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(GROQ_MODEL)
});

});

app.post('/api/chat', async (req, res) => {

try {

const messages = cleanMessages(req.body.messages);

if (!messages.length) {
  return res.status(400).json({
    error: 'Please enter a message first.'
  });
}

const response = await groqRequest(messages, false);
const data = await response.json();

const answer =
  data.choices?.[0]?.message?.content ||
  'I could not create an answer. Please try again.';

res.json({ answer });

} catch (error) {

console.error('Chat error:', error.message);

res.status(error.status || 500).json({
  error: error.message || 'Something went wrong.'
});

}

});

app.post('/api/chat/stream', async (req, res) => {

try {

const messages = cleanMessages(req.body.messages);

if (!messages.length) {
  return res.status(400).json({
    error: 'Please enter a message first.'
  });
}

const upstream = await groqRequest(messages, true);

res.setHeader(
  'Content-Type',
  'text/event-stream; charset=utf-8'
);

res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');

res.flushHeaders?.();

res.write(
  `data: ${JSON.stringify({
    type: 'status',
    message: 'Petrux is thinking and searching when needed…'
  })}\n\n`
);

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

      const piece =
        event.choices?.[0]?.delta?.content;

      if (typeof piece === 'string' && piece.length) {

        res.write(
          `data: ${JSON.stringify({
            type: 'delta',
            text: piece
          })}\n\n`
        );

      }

    } catch (_) {}

  }

}

res.write(
  `data: ${JSON.stringify({
    type: 'done',
    sources: []
  })}\n\n`
);

res.end();

} catch (error) {

console.error('Streaming error:', error.message);

if (!res.headersSent) {

  res.status(error.status || 500).json({
    error: error.message || 'Something went wrong.'
  });

} else {

  res.write(
    `data: ${JSON.stringify({
      type: 'error',
      message: error.message || 'Something went wrong.'
    })}\n\n`
  );

  res.end();

}

}

});

app.post('/api/song', async (req, res) => {

try {

const idea = String(req.body.idea || '').trim();

if (!idea) {
  return res.status(400).json({
    error: 'Describe the song you want first.'
  });
}

const genre = String(
  req.body.genre || 'Afrobeats'
).slice(0, 80);

const mood = String(
  req.body.mood || 'uplifting'
).slice(0, 80);

const messages = [{
  role: 'user',
  content: `Write original song lyrics based on this idea: ${idea}

Genre: ${genre}
Mood: ${mood}
Include a catchy chorus and clear verse sections.
Do not imitate any specific artist.`
}];

const response = await groqRequest(messages, false);
const data = await response.json();

res.json({
  lyrics:
    data.choices?.[0]?.message?.content ||
    'I could not write the lyrics. Please try again.'
});

} catch (error) {

console.error('Song error:', error.message);

res.status(error.status || 500).json({
  error: error.message || 'Could not write lyrics.'
});

}

});

app.post('/api/images', (req, res) => {

res.status(501).json({
error: 'Image generation is not connected yet. A separate image service is required.'
});

});

app.post('/api/song-audio', (req, res) => {

res.status(501).json({
error: 'Full music/audio generation is not connected yet. Lyrics writing is available.'
});

});

app.get('*', (req, res) => {

res.sendFile(
path.join(__dirname, 'public', 'index.html')
);

});

app.listen(PORT, () => {

console.log(
"Petrux AI server is running on port ${PORT}"
);

console.log(
"Groq key configured: ${Boolean(GROQ_API_KEY)}"
);

console.log(
"Internet search enabled: ${Boolean(GROQ_API_KEY) && ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(GROQ_MODEL)}"
);

});
