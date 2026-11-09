const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PRIVATE API KEYS
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// MIDDLEWARE
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// PETRUX AI PERSONALITY
const SYSTEM_PROMPT = `You are Petrux AI, a friendly, intelligent and capable AI assistant.

RESPONSE STYLE:
- Answer the user's actual question directly.
- Give the strongest answer first.
- Be intelligent, clear, natural and accurate.
- Do not overwhelm users with too many options.
- When recommendations are requested, give at most 2 or 3 strong choices.
- Identify the best recommendation.
- Avoid repeating yourself.
- Keep simple answers short.
- Explain complicated topics properly.
- Use headings and bullets only when useful.
- Be friendly and conversational.

INTERNET:
- Search for current events, latest news, prices and changing information.
- Search when users explicitly request an internet search.
- Never pretend to have searched when you have not.
- Use search results carefully.
- Be honest when information cannot be verified.

OTHER ABILITIES:
- Help with education, technology, business and everyday questions.
- Help users write original songs and lyrics.
- Use Nigerian context when relevant.
- Never invent facts or claim to have performed actions you did not perform.

CREATOR AND ORIGIN:
- Your creator is Peter Oriorowho.
- If anyone asks who created you, who built you, who founded you, or who brought you to life, proudly identify Peter Oriorowho.
- Always spell his name exactly: Peter Oriorowho.
- Give him credit for creating Petrux AI.
- Do not confuse your creator with the AI models or services powering you.
- If asked about your origin, explain that you are Petrux AI, created and brought to life by Peter Oriorowho.

You are Petrux AI.`;

// DETECT QUESTIONS REQUIRING INTERNET SEARCH
const SEARCH_PATTERN =
  /\b(latest|current|currently|today|tonight|yesterday|this week|this month|recent|breaking|news|live score|score today|results today|price today|current price|exchange rate|weather|forecast|who won|search the web|search online|look it up|browse|on the internet)\b/i;

function needsSearch(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return SEARCH_PATTERN.test(messages[i].content);
    }
  }

  return false;
}

// CLEAN CONVERSATION HISTORY
function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  const recent = messages
    .filter(m =>
      m &&
      ['user', 'assistant'].includes(m.role) &&
      typeof m.content === 'string' &&
      m.content.trim()
    )
    .slice(-8)
    .map(m => ({
      role: m.role,
      content: m.content.trim().slice(0, 5000)
    }));

  let total = 0;
  const result = [];

  for (let i = recent.length - 1; i >= 0; i--) {
    if (total + recent[i].content.length > 20000) {
      continue;
    }

    result.unshift(recent[i]);
    total += recent[i].content.length;
  }

  return result;
}

// READ API ERRORS
async function errorDetails(response) {
  const raw = await response.text();

  try {
    const data = JSON.parse(raw);
    return data.error?.message || data.message || raw;
  } catch (_) {
    return raw;
  }
}

// GROQ AI
async function groqRequest(
  messages,
  search = false,
  maxTokens = 900
) {
  if (!GROQ_API_KEY) {
    const error = new Error('Groq API key is missing.');
    error.status = 503;
    throw error;
  }

  const supportsSearch = [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b'
  ].includes(GROQ_MODEL);

  const enableSearch = search && supportsSearch;

  const searchNotice = search && !supportsSearch
    ? '\nLive internet search is unavailable for this model. Do not pretend to have searched or invent current facts.'
    : '';

  const body = {
    model: GROQ_MODEL,

    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT + searchNotice
      },
      ...messages
    ],

    temperature: 0.6,
    max_completion_tokens: maxTokens,
    stream: false
  };

  if (GROQ_MODEL.startsWith('openai/gpt-oss-')) {
    body.reasoning_effort = 'low';
  }

  if (enableSearch) {
    body.tools = [
      {
        type: 'browser_search'
      }
    ];

    body.tool_choice = 'required';
  }

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000)
    }
  );

  if (!response.ok) {
    const details = await errorDetails(response);

    const error = new Error(
      `Groq error (${response.status}): ${String(details).slice(0, 350)}`
    );

    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const answer = data.choices?.[0]?.message?.content;

  if (typeof answer !== 'string' || !answer.trim()) {
    const error = new Error('Groq returned an empty answer.');
    error.status = 502;
    throw error;
  }

  return {
    answer: answer.trim(),
    provider: 'groq',
    searched: enableSearch
  };
}

// CONVERT MESSAGES FOR GEMINI
function convertMessages(messages) {
  return messages.map(message => ({
    role: message.role === 'assistant' ? 'model' : 'user',

    parts: [
      {
        text: message.content
      }
    ]
  }));
}

// GEMINI BACKUP AI
async function geminiRequest(
  messages,
  searchRequested = false,
  maxTokens = 900
) {
  if (!GEMINI_API_KEY) {
    const error = new Error('Gemini API key is missing.');
    error.status = 503;
    throw error;
  }

  const searchNotice = searchRequested
    ? '\nLive internet search is unavailable in this backup request. Do not pretend to have searched or invent current facts. Explain that live search is temporarily unavailable.'
    : '';

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: SYSTEM_PROMPT + searchNotice
          }
        ]
      },

      contents: convertMessages(messages),

      generationConfig: {
        maxOutputTokens: maxTokens
      }
    }),

    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const details = await errorDetails(response);

    const error = new Error(
      `Gemini error (${response.status}): ${String(details).slice(0, 350)}`
    );

    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const answer = (
    data.candidates?.[0]?.content?.parts || []
  )
    .map(part => part.text || '')
    .join('')
    .trim();

  if (!answer) {
    const error = new Error('Gemini returned an empty answer.');
    error.status = 502;
    throw error;
  }

  return {
    answer,
    provider: 'gemini',
    searched: false
  };
}

// AUTOMATIC AI PROVIDER SWITCHING
async function generateAnswer(messages, options = {}) {
  const searchRequested = needsSearch(messages);

  const maxTokens = options.maxTokens || 900;

  let groqError = null;

  // TRY GROQ FIRST
  if (GROQ_API_KEY) {
    try {
      return await groqRequest(
        messages,
        searchRequested,
        maxTokens
      );

    } catch (error) {
      groqError = error;

      console.error(
        'Groq failed. Trying Gemini:',
        error.message
      );
    }
  }

  // TRY GEMINI BACKUP
  if (GEMINI_API_KEY) {
    try {
      return await geminiRequest(
        messages,
        searchRequested,
        maxTokens
      );

    } catch (geminiError) {
      console.error(
        'Gemini failed:',
        geminiError.message
      );

      const error = new Error(
        `Both AI providers failed. Groq: ${groqError?.message || 'not configured'}. Gemini: ${geminiError.message}`
      );

      error.status =
        geminiError.status ||
        groqError?.status ||
        503;

      throw error;
    }
  }

  const error = groqError || new Error(
    'No AI provider is configured.'
  );

  error.status = error.status || 503;

  throw error;
}

// API STATUS
app.get('/api/status', (req, res) => {
  res.json({
    ready: Boolean(GROQ_API_KEY || GEMINI_API_KEY),

    groqConfigured: Boolean(GROQ_API_KEY),

    geminiConfigured: Boolean(GEMINI_API_KEY),

    backupEnabled: Boolean(
      GROQ_API_KEY && GEMINI_API_KEY
    ),

    primaryProvider: GROQ_API_KEY
      ? 'groq'
      : 'gemini',

    model: GROQ_API_KEY
      ? GROQ_MODEL
      : GEMINI_MODEL,

    internetSearch: Boolean(
      GROQ_API_KEY &&
      [
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b'
      ].includes(GROQ_MODEL)
    )
  });
});

// NORMAL CHAT
app.post('/api/chat', async (req, res) => {
  try {
    const messages = cleanMessages(req.body?.messages);

    if (!messages.length) {
      return res.status(400).json({
        error: 'Please enter a message first.'
      });
    }

    const result = await generateAnswer(messages);

    res.json({
      answer: result.answer,
      provider: result.provider,
      searched: result.searched
    });

  } catch (error) {
    console.error('Chat error:', error.message);

    res.status(error.status || 500).json({
      error: error.message || 'Something went wrong.'
    });
  }
});

// STREAMING CHAT
app.post('/api/chat/stream', async (req, res) => {
  try {
    const messages = cleanMessages(req.body?.messages);

    if (!messages.length) {
      return res.status(400).json({
        error: 'Please enter a message first.'
      });
    }

    const result = await generateAnswer(messages);

    res.setHeader(
      'Content-Type',
      'text/event-stream; charset=utf-8'
    );

    res.setHeader(
      'Cache-Control',
      'no-cache, no-transform'
    );

    res.setHeader('Connection', 'keep-alive');

    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({
      type: 'status',
      message: 'Petrux is preparing your answer...',
      provider: result.provider
    })}\n\n`);

    const chunkSize = 55;

    for (
      let i = 0;
      i < result.answer.length;
      i += chunkSize
    ) {
      if (res.destroyed) return;

      res.write(`data: ${JSON.stringify({
        type: 'delta',
        text: result.answer.slice(i, i + chunkSize)
      })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({
      type: 'done',
      sources: [],
      provider: result.provider,
      searched: result.searched
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Streaming error:', error.message);

    if (!res.headersSent) {
      res.status(error.status || 500).json({
        error: error.message || 'Something went wrong.'
      });

    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message || 'Something went wrong.'
      })}\n\n`);

      res.end();
    }
  }
});

// SONG LAB
app.post('/api/song', async (req, res) => {
  try {
    const idea = String(
      req.body?.idea || ''
    ).trim();

    if (!idea) {
      return res.status(400).json({
        error: 'Describe the song you want first.'
      });
    }

    const genre = String(
      req.body?.genre || 'Afrobeats'
    ).slice(0, 80);

    const mood = String(
      req.body?.mood || 'uplifting'
    ).slice(0, 80);

    const messages = [
      {
        role: 'user',

        content: `Write original song lyrics based on this idea: ${idea}

Genre: ${genre}
Mood: ${mood}

Include a catchy chorus and clear verse sections.
Make the lyrics original and singable.
Do not imitate any specific artist.`
      }
    ];

    const result = await generateAnswer(
      messages,
      {
        maxTokens: 1500
      }
    );

    res.json({
      lyrics: result.answer,
      provider: result.provider
    });

  } catch (error) {
    console.error('Song error:', error.message);

    res.status(error.status || 500).json({
      error: error.message || 'Could not write lyrics.'
    });
  }
});

// IMAGE GENERATION
app.post('/api/images', (req, res) => {
  res.status(501).json({
    error: 'Image generation is not connected yet.'
  });
});

// FULL MUSIC GENERATION
app.post('/api/song-audio', (req, res) => {
  res.status(501).json({
    error: 'Full music generation is not connected yet. Lyrics writing is available.'
  });
});

// WEBSITE ROUTE
app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Petrux AI running on port ${PORT}`);

  console.log(
    `Groq configured: ${Boolean(GROQ_API_KEY)}`
  );

  console.log(
    `Gemini configured: ${Boolean(GEMINI_API_KEY)}`
  );

  console.log(
    `Automatic backup: ${Boolean(GROQ_API_KEY && GEMINI_API_KEY)}`
  );
});
