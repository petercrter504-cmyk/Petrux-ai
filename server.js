const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

app.use(express.json({ limit: '1mb' }));

app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `
You are Petrux AI, a friendly, intelligent and helpful AI assistant.

Your creator is Peter Oriorowho.
Always spell his name exactly as: Peter Oriorowho.

If someone asks who created you, say:
"Petrux AI was created by Peter Oriorowho."

Be natural, helpful and respectful.
`;

async function askGroq(messages) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          ...messages
        ],
        temperature: 0.7,
        max_completion_tokens: 1500
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Groq error:', data);

    throw new Error(
      data.error?.message ||
      'AI service returned an error.'
    );
  }

  const answer =
    data.choices?.[0]?.message?.content;

  if (!answer) {
    throw new Error(
      'Petrux AI returned an empty response.'
    );
  }

  return answer.trim();
}

/* SERVER STATUS */

app.get('/api/status', function (req, res) {
  res.json({
    online: true,
    name: 'Petrux AI',
    groq: Boolean(GROQ_API_KEY),
    subscription: true
  });
});

/* CHAT */

app.post('/api/chat', async function (req, res) {
  try {
    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [
          {
            role: 'user',
            content: String(req.body.message || '')
          }
        ];

    const cleanMessages = messages
      .filter(function (message) {
        return (
          message &&
          ['user', 'assistant'].includes(message.role) &&
          typeof message.content === 'string' &&
          message.content.trim()
        );
      })
      .slice(-12);

    if (!cleanMessages.length) {
      return res.status(400).json({
        error: 'Please enter a message.'
      });
    }

    const answer = await askGroq(cleanMessages);

    res.json({
      answer
    });

  } catch (error) {
    console.error('Chat error:', error);

    res.status(500).json({
      error: error.message ||
        'Petrux AI could not respond.'
    });
  }
});

/* SONG LAB */

app.post('/api/song', async function (req, res) {
  try {
    const idea = String(req.body.idea || '');
    const genre = String(req.body.genre || 'Afrobeats');
    const mood = String(req.body.mood || 'Emotional');

    if (!idea.trim()) {
      return res.status(400).json({
        error: 'Please enter a song idea.'
      });
    }

    const prompt = `
Write original song lyrics.

Song idea: ${idea}
Genre: ${genre}
Mood: ${mood}

Create a title, verses, chorus and bridge.
Do not copy existing songs or lyrics.
`;

    const lyrics = await askGroq([
      {
        role: 'user',
        content: prompt
      }
    ]);

    res.json({ lyrics });

  } catch (error) {
    console.error('Song error:', error);

    res.status(500).json({
      error: error.message ||
        'Could not create the song.'
    });
  }
});

/* IMAGE STATUS */

app.post('/api/image', function (req, res) {
  res.status(501).json({
    error:
      'Image generation is not connected yet. The Petrux AI image design is ready, but an image-generation API needs to be connected.'
  });
});

/* FALLBACK */

app.get('*', function (req, res) {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

app.listen(PORT, function () {
  console.log('==============================');
  console.log('PETRUX AI ONLINE');
  console.log(`Port: ${PORT}`);
  console.log(
    GROQ_API_KEY
      ? 'Groq API: Configured'
      : 'Groq API: Missing'
  );
  console.log('Creator: Peter Oriorowho');
  console.log('==============================');
});
