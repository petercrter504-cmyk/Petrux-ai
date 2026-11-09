const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================
   ENVIRONMENT VARIABLES
========================================= */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const PRO_TOKEN_SECRET =
  process.env.PRO_TOKEN_SECRET ||
  (PAYSTACK_SECRET_KEY
    ? crypto.createHash('sha256')
        .update(PAYSTACK_SECRET_KEY)
        .digest('hex')
    : '');

const PUBLIC_APP_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ''
).replace(/\/+$/, '');

const PRICE = 120000;
const DURATION = 7 * 24 * 60 * 60 * 1000;
const PLAN = 'petrux_pro_7_days';
const TIMEOUT = 30000;

/* =========================================
   PETRUX AI SYSTEM PROMPT
========================================= */

const SYSTEM_PROMPT = `
You are Petrux AI, an intelligent, friendly and capable AI assistant.

Your creator is Peter Oriorowho. He created and brought Petrux AI to life.
Always spell his name exactly: Peter Oriorowho.

If asked who created you, identify Peter Oriorowho.

Answer questions directly and naturally.
Be helpful with education, technology, business, entertainment and everyday topics.
Help write original songs, lyrics, poems and stories.
Understand Nigerian context when relevant.

Never pretend to have searched the internet.
Never invent facts. Be honest about uncertainty.

You are Petrux AI, created by Peter Oriorowho.
`;

/* =========================================
   HELPER FUNCTIONS
========================================= */

function emailOK(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function appURL(req) {
  return PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
}

function bearer(req) {
  const match = (req.headers.authorization || '').match(
    /^Bearer\s+(.+)$/i
  );

  return match ? match[1].trim() : '';
}

function sendError(res, err, fallback) {
  console.error('ERROR:', err);

  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || fallback || 'Something went wrong.'
    });
  }
}

/* =========================================
   PRO TOKEN FUNCTIONS
========================================= */

function sign(data) {
  if (!PRO_TOKEN_SECRET) {
    throw new Error('Pro token secret is not configured.');
  }

  const encoded = Buffer
    .from(JSON.stringify(data))
    .toString('base64url');

  const signature = crypto
    .createHmac('sha256', PRO_TOKEN_SECRET)
    .update(encoded)
    .digest('hex');

  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!PRO_TOKEN_SECRET || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');

  if (parts.length !== 2) {
    return null;
  }

  const encoded = parts[0];
  const signature = parts[1];

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return null;
  }

  const expected = crypto
    .createHmac('sha256', PRO_TOKEN_SECRET)
    .update(encoded)
    .digest('hex');

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    );

    if (
      !emailOK(payload.email) ||
      payload.plan !== PLAN ||
      typeof payload.reference !== 'string' ||
      !Number.isFinite(payload.iat) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() ||
      payload.exp <= payload.iat
    ) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

function createToken(email, reference, paidAt) {
  const time = paidAt ? Date.parse(paidAt) : Date.now();

  if (
    !Number.isFinite(time) ||
    time > Date.now() + 300000
  ) {
    throw new Error('Invalid payment timestamp.');
  }

  return sign({
    email: email.toLowerCase(),
    reference,
    plan: PLAN,
    iat: time,
    exp: time + DURATION
  });
}

function requirePro(req, res, next) {
  const user = verifyToken(bearer(req));

  if (!user) {
    return res.status(403).json({
      error: 'Petrux Pro is required. Please subscribe or renew.',
      code: 'PRO_REQUIRED'
    });
  }

  req.proUser = user;
  next();
}

/* =========================================
   PAYSTACK FUNCTIONS
========================================= */

async function paystack(url, options = {}) {
  if (!PAYSTACK_SECRET_KEY) {
    const err = new Error(
      'Add PAYSTACK_SECRET_KEY to environment variables.'
    );

    err.status = 503;
    throw err;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.status !== true) {
    const err = new Error(
      data.message || 'Paystack request failed.'
    );

    err.status = response.status || 502;
    throw err;
  }

  return data.data;
}

async function verifyPayment(reference) {
  if (
    typeof reference !== 'string' ||
    reference.length < 8 ||
    reference.length > 100 ||
    !/^[a-zA-Z0-9_.=-]+$/.test(reference)
  ) {
    const err = new Error('Invalid payment reference.');
    err.status = 400;
    throw err;
  }

  const payment = await paystack(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET'
    }
  );

  if (
    payment.status !== 'success' ||
    Number(payment.amount) !== PRICE ||
    String(payment.currency).toUpperCase() !== 'NGN' ||
    payment.reference !== reference ||
    !emailOK(payment.customer?.email) ||
    payment.metadata?.plan !== PLAN
  ) {
    const err = new Error(
      'Payment could not be verified.'
    );

    err.status = 400;
    throw err;
  }

  return payment;
}

function paymentPage(res, success, token, message) {
  const safeMessage = String(message || '')
    .replace(/[<>&"']/g, '');

  const script = success
    ? `
      try {
        localStorage.setItem(
          'petrux_pro_token',
          ${JSON.stringify(token || '')}
        );
      } catch (e) {}

      setTimeout(function () {
        location.replace('/');
      }, 1800);
    `
    : '';

  res
    .status(success ? 200 : 400)
    .type('html')
    .send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Petrux AI</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #090b14;
  color: white;
  font-family: Arial, sans-serif;
}
main {
  max-width: 420px;
  margin: 20px;
  padding: 30px;
  border: 1px solid #292d42;
  border-radius: 20px;
  background: #111525;
  text-align: center;
}
p {
  color: #c2c7d8;
}
a {
  display: inline-block;
  margin-top: 14px;
  padding: 13px 22px;
  border-radius: 12px;
  background: #7557ed;
  color: white;
  text-decoration: none;
}
</style>
</head>
<body>
<main>
<h1>${success ? 'Petrux Pro activated!' : 'Payment not confirmed'}</h1>
<p>${
  success
    ? 'Your 7-day Pro access is ready. Returning to Petrux AI...'
    : safeMessage
}</p>
<a href="/">Return to Petrux AI</a>
</main>
<script>
${script}
</script>
</body>
</html>
`);
}

/* =========================================
   CHAT FUNCTIONS
========================================= */

const SEARCH_PATTERN =
  /\b(latest|current|currently|today|tonight|yesterday|this week|this month|recent|breaking|news|live score|score today|results today|price today|current price|exchange rate|weather|forecast|who won|search the web|search online|look it up|browse|on the internet)\b/i;

function clean(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const list = messages
    .filter(function (message) {
      return (
        message &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string' &&
        message.content.trim()
      );
    })
    .slice(-8)
    .map(function (message) {
      return {
        role: message.role,
        content: message.content.trim().slice(0, 5000)
      };
    });

  let total = 0;
  const output = [];

  for (let i = list.length - 1; i >= 0; i--) {
    if (total + list[i].content.length > 20000) {
      continue;
    }

    output.unshift(list[i]);
    total += list[i].content.length;
  }

  return output;
}

function instant(messages) {
  const message = messages[messages.length - 1];

  if (!message || message.role !== 'user') {
    return null;
  }

  const replies = {
    hi: "Hey! 😊 I'm Petrux AI. How can I help you today?",
    hello: "Hello! 👋 What would you like to talk about?",
    hey: "Hey there! 😊 What's on your mind?",
    "good morning": "Good morning! ☀️ How can I help?",
    "good afternoon": "Good afternoon! How can I help?",
    "good evening": "Good evening! 🌙 How are you doing?",
    "how are you": "I'm doing great and ready to help you!",
    "how are you doing": "I'm doing well and ready to help!",
    "who are you": "I'm Petrux AI, created by Peter Oriorowho."
  };

  return replies[message.content.trim().toLowerCase()] || null;
}

/* =========================================
   AI PROVIDERS
========================================= */

const cache = new Map();
let groqBlockedUntil = 0;

async function getDetails(response) {
  const raw = await response.text();

  try {
    const data = JSON.parse(raw);
    return data.error?.message || data.message || raw;
  } catch (err) {
    return raw;
  }
}

async function groq(messages, search, max = 900) {
  if (!GROQ_API_KEY) {
    const err = new Error('Groq API key is missing.');
    err.status = 503;
    throw err;
  }

  const supportsSearch = [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b'
  ].includes(GROQ_MODEL);

  const useSearch = search && supportsSearch;

  const body = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          SYSTEM_PROMPT +
          (
            search && !supportsSearch
              ? '\nLive search is unavailable. Do not pretend to search.'
              : ''
          )
      },
      ...messages
    ],
    temperature: 0.6,
    max_completion_tokens: max,
    stream: false
  };

  if (GROQ_MODEL.startsWith('openai/gpt-oss-')) {
    body.reasoning_effort = 'low';
  }

  /*
   * Browser search is disabled here for reliability.
   * The AI will not claim it searched the internet.
   */

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT)
    }
  );

  if (!response.ok) {
    const err = new Error(
      `Groq error (${response.status}): ${String(
        await getDetails(response)
      ).slice(0, 350)}`
    );

    err.status = response.status;

    const retry = Number(
      response.headers.get('retry-after')
    );

    if (retry > 0) {
      err.retryAfterMs = retry * 1000;
    }

    throw err;
  }

  const data = await response.json();

  const answer =
    data.choices?.[0]?.message?.content;

  if (
    typeof answer !== 'string' ||
    !answer.trim()
  ) {
    throw new Error('Groq returned an empty answer.');
  }

  return {
    answer: answer.trim(),
    provider: 'groq',
    searched: false
  };
}

async function gemini(messages, search, max = 900) {
  if (!GEMINI_API_KEY) {
    const err = new Error('Gemini API key is missing.');
    err.status = 503;
    throw err;
  }

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              SYSTEM_PROMPT +
              (
                search
                  ? '\nLive internet search is unavailable. Do not invent current facts.'
                  : ''
              )
          }
        ]
      },
      contents: messages.map(function (message) {
        return {
          role:
            message.role === 'assistant'
              ? 'model'
              : 'user',
          parts: [
            {
              text: message.content
            }
          ]
        };
      }),
      generationConfig: {
        maxOutputTokens: max
      }
    }),
    signal: AbortSignal.timeout(TIMEOUT)
  });

  if (!response.ok) {
    const details = String(
      await getDetails(response)
    ).slice(0, 350);

    throw new Error(
      `Gemini error (${response.status}): ${details}`
    );
  }

  const data = await response.json();

  const answer =
    (data.candidates?.[0]?.content?.parts || [])
      .map(function (part) {
        return part.text || '';
      })
      .join('')
      .trim();

  if (!answer) {
    throw new Error('Gemini returned an empty answer.');
  }

  return {
    answer,
    provider: 'gemini',
    searched: false
  };
}

async function generate(messages, max = 900) {
  const quick = instant(messages);

  if (quick) {
    return {
      answer: quick,
      provider: 'instant',
      searched: false
    };
  }

  const userMessages = messages.filter(function (message) {
    return message.role === 'user';
  });

  const lastUserMessage =
    userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : '';

  const search = SEARCH_PATTERN.test(
    lastUserMessage
  );

  const key = JSON.stringify(messages);

  if (
    !search &&
    cache.has(key) &&
    cache.get(key).expires > Date.now()
  ) {
    return {
      ...cache.get(key).result,
      cached: true
    };
  }

  if (
    GROQ_API_KEY &&
    Date.now() >= groqBlockedUntil
  ) {
    try {
      const result = await groq(
        messages,
        search,
        max
      );

      if (!search) {
        cache.set(key, {
          result,
          expires: Date.now() + 300000
        });

        if (cache.size > 200) {
          cache.delete(
            cache.keys().next().value
          );
        }
      }

      return result;
    } catch (err) {
      console.error('Groq error:', err.message);

      if (err.status === 429) {
        groqBlockedUntil =
          Date.now() +
          (err.retryAfterMs || 900000) +
          10000;
      }
    }
  }

  if (GEMINI_API_KEY) {
    try {
      const result = await gemini(
        messages,
        search,
        max
      );

      if (!search) {
        cache.set(key, {
          result,
          expires: Date.now() + 300000
        });
      }

      return result;
    } catch (err) {
      console.error('Gemini error:', err.message);
    }
  }

  const err = new Error(
    'Petrux AI is temporarily unable to respond. Check your API keys or try again later.'
  );

  err.status = 503;
  throw err;
}

/* =========================================
   API STATUS
========================================= */

app.get('/api/status', function (req, res) {
  res.json({
    name: 'Petrux AI',
    online: true,
    providers: {
      groq: !!GROQ_API_KEY,
      gemini: !!GEMINI_API_KEY
    },
    subscription: {
      enabled: !!(
        PAYSTACK_SECRET_KEY &&
        PRO_TOKEN_SECRET
      ),
      price: 1200,
      currency: 'NGN',
      durationDays: 7
    },
    creator: 'Peter Oriorowho'
  });
});

/* =========================================
   CHAT
========================================= */

app.post('/api/chat', async function (req, res) {
  try {
    const messages = clean(
      req.body.messages || [
        {
          role: 'user',
          content: req.body.message || ''
        }
      ]
    );

    if (!messages.length) {
      return res.status(400).json({
        error: 'Please enter a message.'
      });
    }

    const result = await generate(messages);

    res.json(result);
  } catch (err) {
    sendError(
      res,
      err,
      'Petrux AI could not respond.'
    );
  }
});

app.post(
  '/api/chat/stream',
  async function (req, res) {
    try {
      const messages = clean(
        req.body.messages || [
          {
            role: 'user',
            content: req.body.message || ''
          }
        ]
      );

      if (!messages.length) {
        return res.status(400).json({
          error: 'Please enter a message.'
        });
      }

      const result = await generate(messages);

      res.setHeader(
        'Content-Type',
        'text/event-stream'
      );

      res.setHeader(
        'Cache-Control',
        'no-cache'
      );

      res.setHeader(
        'Connection',
        'keep-alive'
      );

      res.flushHeaders();

      const words =
        result.answer.split(/(\s+)/);

      for (const word of words) {
        if (res.destroyed) {
          return;
        }

        res.write(
          `data: ${JSON.stringify({
            token: word
          })}\n\n`
        );
      }

      res.write(
        `data: ${JSON.stringify({
          done: true,
          provider: result.provider,
          searched: result.searched
        })}\n\n`
      );

      res.end();
    } catch (err) {
      console.error(
        'Streaming error:',
        err.message
      );

      if (!res.headersSent) {
        return res.status(
          err.status || 500
        ).json({
          error: err.message
        });
      }

      res.write(
        `data: ${JSON.stringify({
          error: err.message
        })}\n\n`
      );

      res.end();
    }
  }
);

/* =========================================
   SONG GENERATION
========================================= */

app.post('/api/song', async function (req, res) {
  try {
    const prompt = String(
      req.body.prompt ||
      req.body.message ||
      ''
    ).trim();

    if (!prompt) {
      return res.status(400).json({
        error: 'Describe the song you want.'
      });
    }

    const result = await generate(
      [
        {
          role: 'user',
          content:
            `Write original song lyrics based on: ${prompt}\n` +
            'Include a title, catchy chorus, verses and natural musical flow. ' +
            'Do not copy existing songs.'
        }
      ],
      1800
    );

    res.json({
      lyrics: result.answer,
      provider: result.provider
    });
  } catch (err) {
    sendError(
      res,
      err,
      'Song generation failed.'
    );
  }
});

/* =========================================
   PAYSTACK SUBSCRIPTION
========================================= */

app.post(
  '/api/subscription/initialize',
  async function (req, res) {
    try {
      const email = String(
        req.body.email || ''
      ).trim().toLowerCase();

      if (!emailOK(email)) {
        return res.status(400).json({
          error: 'Enter a valid email address.'
        });
      }

      if (
        !PAYSTACK_SECRET_KEY ||
        !PRO_TOKEN_SECRET
      ) {
        return res.status(503).json({
          error:
            'Payment system is not configured.'
        });
      }

      const reference = String(
  req.body.reference || ''
).trim();

const payment =
  await verifyPayment(reference);

const token = createToken(
  payment.customer.email,
  payment.reference,
  payment.paid_at
);

const paymentTime =
  payment.paid_at
    ? Date.parse(payment.paid_at)
    : Date.now();

res.json({
  success: true,
  message:
    'Petrux Pro activated successfully.',
  token: token,
  email: payment.customer.email,
  expires_at: new Date(
    paymentTime + DURATION
  ).toISOString()
});
    } catch (err) {
      sendError(
        res,
        err,
        'Payment verification failed.'
      );
    }
  }
);

/* =========================================
   PAYSTACK CALLBACK
========================================= */

app.get(
  '/api/subscription/callback',
  async function (req, res) {
    try {
      const reference = String(
        req.query.reference || ''
      ).trim();

      if (!reference) {
        return paymentPage(
          res,
          false,
          '',
          'No payment reference was received.'
        );
      }

      const payment =
        await verifyPayment(reference);

      const token = createToken(
        payment.customer.email,
        payment.reference,
        payment.paid_at
      );

      return paymentPage(
        res,
        true,
        token,
        'Payment successful.'
      );
    } catch (err) {
      console.error(
        'Paystack callback error:',
        err.message
      );

      return paymentPage(
        res,
        false,
        '',
        'We could not confirm your payment. Contact support if money was deducted.'
      );
    }
  }
);
