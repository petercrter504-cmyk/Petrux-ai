const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// API CONFIGURATION
// ==========================================

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const REQUEST_TIMEOUT = 120000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// PETRUX AI PERSONALITY
// ==========================================

const SYSTEM_PROMPT = `You are Petrux AI, a friendly, intelligent and capable AI assistant.

RESPONSE STYLE:
- Answer the user's actual question directly.
- Give the strongest answer first.
- Be intelligent, clear, natural and accurate.
- Do not overwhelm users with too many options.
- Give at most 2 or 3 strong recommendations.
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

// ==========================================
// INTERNET SEARCH DETECTION
// ==========================================

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

// ==========================================
// CLEAN CONVERSATION HISTORY
// ==========================================

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

// ==========================================
// INSTANT REPLIES
// ==========================================

function instantReply(messages) {
  if (!messages.length) return null;

  const last = messages[messages.length - 1];

  if (last.role !== 'user') return null;

  const text = last.content.trim().toLowerCase();

  const greetings = {
    hi: "Hey! 😊 I'm Petrux AI. How can I help you today?",

    hello: "Hello! 👋 Great to hear from you. What would you like to talk about?",

    hey: "Hey there! 😊 What's on your mind?",

    "good morning": "Good morning! ☀️ How can I make your day better?",

    "good afternoon": "Good afternoon! 😊 What can I help you with?",

    "good evening": "Good evening! 🌙 How are you doing?",

    "how are you": "I'm doing great and ready to help you! How are you?",

    "how are you doing": "I'm doing well! 😊 What can I help you with?",

    "who are you": "I'm Petrux AI, your intelligent AI assistant, created by Peter Oriorowho."
  };

  return greetings[text] || null;
}

// ==========================================
// RESPONSE CACHE
// ==========================================

const responseCache = new Map();

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

function getCacheKey(messages) {
  return JSON.stringify(messages);
}

function getCachedAnswer(key) {
  const item = responseCache.get(key);

  if (!item) return null;

  if (Date.now() > item.expires) {
    responseCache.delete(key);
    return null;
  }

  return item.result;
}

function saveCachedAnswer(key, result) {
  responseCache.set(key, {
    result,
    expires: Date.now() + CACHE_DURATION
  });

  if (responseCache.size > MAX_CACHE_SIZE) {
    const oldest = responseCache.keys().next().value;

    responseCache.delete(oldest);
  }
}

// ==========================================
// READ API ERRORS
// ==========================================

async function errorDetails(response) {
  const raw = await response.text();

  try {
    const data = JSON.parse(raw);

    return data.error?.message || data.message || raw;

  } catch (_) {
    return raw;
  }
}

// ==========================================
// GROQ AI
// ==========================================

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

      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    }
  );

  if (!response.ok) {
    const details = await errorDetails(response);

    const error = new Error(
      `Groq error (${response.status}): ${String(details).slice(0, 350)}`
    );

    error.status = response.status;

    const retryAfter = Number(
      response.headers.get('retry-after')
    );

    if (retryAfter > 0) {
      error.retryAfterMs = retryAfter * 1000;
    }

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

// ==========================================
// CONVERT MESSAGES FOR GEMINI
// ==========================================

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

// ==========================================
// GEMINI BACKUP AI
// ==========================================

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

    signal: AbortSignal.timeout(REQUEST_TIMEOUT)
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

// ==========================================
// AUTOMATIC PROVIDER SWITCHING
// ==========================================

let groqBlockedUntil = 0;

async function generateAnswer(messages, options = {}) {

  // 1. HANDLE SIMPLE GREETINGS WITHOUT API TOKENS.

  const instant = instantReply(messages);

  if (instant) {
    return {
      answer: instant,
      provider: 'instant',
      searched: false
    };
  }

  const searchRequested = needsSearch(messages);

  const maxTokens = options.maxTokens || 900;

  // 2. CHECK CACHE.
  // Current-information searches are never cached.

  const cacheKey = getCacheKey(messages);

  if (!searchRequested) {
    const cached = getCachedAnswer(cacheKey);

    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }
  }

  let groqError = null;

  // 3. TRY GROQ IF IT IS NOT IN COOLDOWN.

  if (
    GROQ_API_KEY &&
    Date.now() >= groqBlockedUntil
  ) {
    try {
      const result = await groqRequest(
        messages,
        searchRequested,
        maxTokens
      );

      if (!searchRequested) {
        saveCachedAnswer(cacheKey, result);
      }

      return result;

    } catch (error) {
      groqError = error;

      // PAUSE GROQ AFTER A RATE LIMIT ERROR.

      if (error.status === 429) {
        const match = error.message.match(
          /try again in\s+(\d+)m(?:(\d+(?:\.\d+)?)s)?/i
        );

        let waitSeconds = 900;

        if (match) {
          waitSeconds =
            Number(match[1]) * 60 +
            Number(match[2] || 0) + 10;
        } else if (error.retryAfterMs) {
          waitSeconds = error.retryAfterMs / 1000 + 10;
        }

        groqBlockedUntil =
          Date.now() + waitSeconds * 1000;

        console.log(
          `Groq rate-limited. Pausing for ${waitSeconds} seconds.`
        );
      }

      console.error(
        'Groq failed. Trying Gemini:',
        error.message
      );
    }
  }

  // 4. TRY GEMINI AUTOMATICALLY.

  if (GEMINI_API_KEY) {
    try {
      const result = await geminiRequest(
        messages,
        searchRequested,
        maxTokens
      );

      if (!searchRequested) {
        saveCachedAnswer(cacheKey, result);
      }

      return result;

    } catch (geminiError) {
      console.error(
        'Gemini failed:',
        geminiError.message
      );

      const error = new Error(
        `AI providers unavailable. Groq: ${
          groqError?.message || 'temporarily unavailable'
        }. Gemini: ${geminiError.message}`
      );

      error.status = 503;

      throw error;
    }
  }

  const error = groqError || new Error(
    'No AI provider is configured.'
  );

  error.status = error.status || 503;

  throw error;
}

// ==========================================
// API STATUS
// ==========================================

app.get('/api/status', (req, res) => {
  res.json({
    ready: Boolean(GROQ_API_KEY || GEMINI_API_KEY),

    groqConfigured: Boolean(GROQ_API_KEY),

    geminiConfigured: Boolean(GEMINI_API_KEY),

    backupEnabled: Boolean(
      GROQ_API_KEY && GEMINI_API_KEY
    ),

    groqCoolingDown: Date.now() < groqBlockedUntil,

    groqAvailableAgainIn: Math.max(
      0,
      Math.ceil((groqBlockedUntil - Date.now()) / 1000)
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

// ==========================================
// NORMAL CHAT
// ==========================================

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
      searched: result.searched,
      cached: Boolean(result.cached)
    });

  } catch (error) {
    console.error('Chat error:', error.message);

    res.status(error.status || 500).json({
      error: error.message || 'Something went wrong.'
    });
  }
});

// ==========================================
// STREAMING CHAT
// ==========================================

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
      searched: result.searched,
      cached: Boolean(result.cached)
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

// ==========================================
// SONG LAB
// ==========================================

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

// ==========================================
// IMAGE GENERATION
// ==========================================

app.post('/api/images', (req, res) => {
  res.status(501).json({
    error: 'Image generation is not connected yet.'
  });
});

// ==========================================
// FULL MUSIC GENERATION
// ==========================================

app.post('/api/song-audio', (req, res) => {
  res.status(501).json({
    error: 'Full music generation is not connected yet. Lyrics writing is available.'
  });
});

// ==========================================
// WEBSITE ROUTE
// ==========================================

app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

// ==========================================
// START SERVER
// ==========================================

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
