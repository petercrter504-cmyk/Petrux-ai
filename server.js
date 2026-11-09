const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
/* ================================
   ENVIRONMENT VARIABLES
================================ */
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PRO_TOKEN_SECRET =
  process.env.PRO_TOKEN_SECRET ||
  (PAYSTACK_SECRET_KEY
    ? crypto.createHash('sha256').update(PAYSTACK_SECRET_KEY).digest('hex')
    : '');
const PUBLIC_APP_URL = (
  process.env.PUBLIC_APP_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  ''
).replace(/\/+$/, '');
const PRICE = 120000;
const DURATION = 7 * 86400000;
const PLAN = 'petrux_pro_7_days';
const TIMEOUT = 30000;
const SYSTEM_PROMPT = `
You are Petrux AI, an intelligent, friendly and capable AI assistant.
Your creator is Peter Oriorowho. He created and brought Petrux AI to life.
Always spell his name exactly: Peter Oriorowho.
If asked who created you, identify Peter Oriorowho.
Answer questions directly and naturally.
Be helpful with education, technology, business, entertainment and everyday topics.
Help write original songs, lyrics, poems and stories.
Understand Nigerian context when relevant.
When browser search is enabled, use it to verify current information.
Never pretend to have searched the internet.
Never invent facts. Be honest about uncertainty.
You are Petrux AI, created by Peter Oriorowho.
`;
const emailOK = e =>
  typeof e === 'string' &&
  e.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const appURL = req =>
  PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
const bearer = req =>
  (req.headers.authorization || '')
    .match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
function error(res, e, fallback) {
  console.error('ERROR:', e);
  if (!res.headersSent) {
    res.status(e.status || 500).json({
      error: e.message || fallback || 'Something went wrong.'
    });
  }
}
/* ================================
   PRO TOKEN SYSTEM
================================ */
function sign(data) {
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', PRO_TOKEN_SECRET)
    .update(encoded)
    .digest('hex');
  return `${encoded}.${signature}`;
}
function verifyToken(token) {
  if (!PRO_TOKEN_SECRET || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!/^[a-f0-9]{64}$/i.test(sig)) return null;
  const expected = crypto
    .createHmac('sha256', PRO_TOKEN_SECRET)
    .update(encoded)
    .digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const p = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    );
    if (
      !emailOK(p.email) ||
      p.plan !== PLAN ||
      typeof p.reference !== 'string' ||
      !Number.isFinite(p.iat) ||
      !Number.isFinite(p.exp) ||
      p.exp <= Date.now() ||
      p.exp <= p.iat
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}
function createToken(email, reference, paidAt) {
  const time = paidAt ? Date.parse(paidAt) : Date.now();
  if (!Number.isFinite(time) || time > Date.now() + 300000) {
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
/* ================================
   PAYSTACK CONNECTION
================================ */
async function paystack(url, options = {}) {
  if (!PAYSTACK_SECRET_KEY) {
    const e = new Error(
      'Add PAYSTACK_SECRET_KEY to environment variables.'
    );
    e.status = 503;
    throw e;
  }
  const r = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status !== true) {
    const e = new Error(data.message || 'Paystack request failed.');
    e.status = r.status || 502;
    throw e;
  }
  return data.data;
}
async function verifyPayment(ref) {
  if (
    typeof ref !== 'string' ||
    ref.length < 8 ||
    ref.length > 100 ||
    !/^[a-zA-Z0-9_.=-]+$/.test(ref)
  ) {
    const e = new Error('Invalid payment reference.');
    e.status = 400;
    throw e;
  }
  const p = await paystack(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
    { method: 'GET' }
  );
  if (
    p.status !== 'success' ||
    Number(p.amount) !== PRICE ||
    String(p.currency).toUpperCase() !== 'NGN' ||
    p.reference !== ref ||
    !emailOK(p.customer?.email) ||
    p.metadata?.plan !== PLAN
  ) {
    const e = new Error('Payment could not be verified.');
    e.status = 400;
    throw e;
  }
  return p;
}
/* ================================
   PAYMENT RESULT PAGE
================================ */
function paymentPage(res, success, token, message) {
  const safe = String(message || '').replace(/[<>&"']/g, '');
  res.status(success ? 200 : 400).type('html').send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Petrux AI</title>
<style>
body{
margin:0;
min-height:100vh;
display:grid;
place-items:center;
background:#090b14;
color:white;
font-family:Arial
}
main{
max-width:420px;
margin:20px;
padding:30px;
border:1px solid #292d42;
border-radius:20px;
background:#111525;
text-align:center
}
p{color:#c2c7d8}
a{
display:inline-block;
margin-top:14px;
padding:13px 22px;
border-radius:12px;
background:#7557ed;
color:white;
text-decoration:none
}
</style>
</head>
<body>
<main>
<h1>${success ? 'Petrux Pro activated!' : 'Payment not confirmed'}</h1>
<p>
${success
  ? 'Your 7-day Pro access is ready. Returning to Petrux AI...'
  : safe}
</p>
<a href="/">Return to Petrux AI</a>
</main>
<script>
${success
  ? `try {
      localStorage.setItem(
        'petrux_pro_token',
        ${JSON.stringify(token || '')}
      );
    } catch(e) {}
    setTimeout(() => location.replace('/'), 1800);`
  : ''}
</script>
</body>
</html>
`);
}
/* ================================
   AI SYSTEM AND WEB SEARCH
================================ */
const SEARCH =
  /\b(latest|current|currently|today|tonight|yesterday|this week|this month|recent|breaking|news|live score|score today|results today|price today|current price|exchange rate|weather|forecast|who won|search the web|search online|look it up|browse|on the internet|search for|find information about|research)\b/i;
const BROWSER_SEARCH_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-safeguard-20b'
];
function searchContext() {
  return `
LIVE WEB SEARCH IS ENABLED.
Use the browser_search tool to research the user's question.
Base current-information answers on the information retrieved.
Do not invent search results, sources or URLs.
If the search does not provide enough information, say so honestly.
Include source references supplied by the search system when available.
`;
}
function clean(messages) {
  if (!Array.isArray(messages)) return [];
  const list = messages
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
  let out = [];
  for (let i = list.length - 1; i >= 0; i--) {
    if (total + list[i].content.length > 20000) continue;
    out.unshift(list[i]);
    total += list[i].content.length;
  }
  return out;
}
function instant(messages) {
  const m = messages[messages.length - 1];
  if (!m || m.role !== 'user') return null;
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
  return replies[m.content.trim().toLowerCase()] || null;
}
const cache = new Map();
let groqBlockedUntil = 0;
async function details(r) {
  const raw = await r.text();
  try {
    const d = JSON.parse(raw);
    return d.error?.message || d.message || raw;
  } catch {
    return raw;
  }
}
/* ================================
   SOURCE EXTRACTION
================================ */
function extractSources(data) {
  const sources = [];
  const seen = new Set();
  const visited = new WeakSet();
  function addSource(url, title = '') {
    if (
      typeof url !== 'string' ||
      !/^https?:\/\//i.test(url) ||
      seen.has(url)
    ) {
      return;
    }
    seen.add(url);
    sources.push({
      title: String(title || url).slice(0, 300),
      url
    });
  }
  function walk(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);
    const url =
      value.url ||
      value.uri ||
      value.link ||
      value.source_url ||
      value.sourceUrl;
    const title =
      value.title ||
      value.name ||
      value.source_title ||
      value.sourceTitle ||
      '';
    if (url) addSource(url, title);
    Object.values(value).forEach(walk);
  }
  walk(data);
  return sources.slice(0, 12);
}
/* ================================
   GROQ AI WITH BUILT-IN BROWSER SEARCH
================================ */
async function groq(messages, search, max = 900) {
  if (!GROQ_API_KEY) {
    const e = new Error('Groq API key is missing.');
    e.status = 503;
    throw e;
  }
  if (search && !BROWSER_SEARCH_MODELS.includes(GROQ_MODEL)) {
    const e = new Error(
      'Live web search requires a supported Groq model. Set GROQ_MODEL to openai/gpt-oss-20b in Render.'
    );
    e.status = 503;
    throw e;
  }
  console.log(`Groq request started. Model: ${GROQ_MODEL}`);
  console.log(`Groq browser search: ${search ? 'ENABLED' : 'DISABLED'}`);
  const body = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          SYSTEM_PROMPT +
          (search ? '\n' + searchContext() : '')
      },
      ...messages
    ],
    temperature: search ? 1 : 0.6,
    max_completion_tokens: max,
    stream: false
  };
  if (GROQ_MODEL.startsWith('openai/gpt-oss-')) {
    body.reasoning_effort = 'low';
  }
  if (search) {
    body.tools = [
      {
        type: 'browser_search'
      }
    ];
    body.tool_choice = 'required';
  }
  const r = await fetch(
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
  if (!r.ok) {
    const e = new Error(
      `Groq error (${r.status}): ${String(await details(r)).slice(0, 350)}`
    );
    e.status = r.status;
    const retry = Number(r.headers.get('retry-after'));
    if (retry > 0) {
      e.retryAfterMs = retry * 1000;
    }
    throw e;
  }
  const d = await r.json();
  const answer = d.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) {
    throw new Error('Groq returned an empty answer.');
  }
  const sources = search ? extractSources(d) : [];
  console.log('Groq response successful.');
  console.log(`Sources found: ${sources.length}`);
  return {
    answer: answer.trim(),
    provider: 'groq',
    searched: search,
    sources
  };
}
/* ================================
   GEMINI AI
================================ */
async function gemini(messages, max = 900) {
  if (!GEMINI_API_KEY) {
    const e = new Error('Gemini API key is missing.');
    e.status = 503;
    throw e;
  }
  console.log(`Gemini request started. Model: ${GEMINI_MODEL}`);
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=` +
    `${encodeURIComponent(GEMINI_API_KEY)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: SYSTEM_PROMPT
        }]
      },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        maxOutputTokens: max
      }
    }),
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!r.ok) {
    throw new Error(
      `Gemini error (${r.status}): ${String(await details(r)).slice(0, 350)}`
    );
  }
  const d = await r.json();
  const answer = (
    d.candidates?.[0]?.content?.parts || []
  ).map(p => p.text || '').join('').trim();
  if (!answer) {
    throw new Error('Gemini returned an empty answer.');
  }
  console.log('Gemini response successful.');
  return {
    answer,
    provider: 'gemini',
    searched: false,
    sources: []
  };
}
/* ================================
   RESPONSE GENERATION
================================ */
async function generate(
  messages,
  max = 900,
  forceSearch = false
) {
  const lastUserMessage =
    messages.filter(m => m.role === 'user').at(-1)?.content || '';
  const search =
    forceSearch === true ||
    SEARCH.test(lastUserMessage);
  const quick = search ? null : instant(messages);
  if (quick) {
    console.log('Instant response used.');
    return {
      answer: quick,
      provider: 'instant',
      searched: false,
      sources: []
    };
  }
  const key = JSON.stringify(messages);
  if (
    !search &&
    cache.has(key) &&
    cache.get(key).expires > Date.now()
  ) {
    console.log('Using cached response.');
    return {
      ...cache.get(key).result,
      cached: true
    };
  }
  /*
     LIVE SEARCH REQUESTS MUST USE GROQ.
     Gemini must not silently answer current-information
     questions without a real web search.
  */
  if (search) {
    if (!GROQ_API_KEY) {
      const e = new Error(
        'Live web search is unavailable because the Groq API key is missing.'
      );
      e.status = 503;
      throw e;
    }
    try {
      return await groq(messages, true, max);
    } catch (e) {
      console.error('LIVE WEB SEARCH ERROR:', e.message);
      if (e.status === 429) {
        groqBlockedUntil =
          Date.now() + (e.retryAfterMs || 900000) + 10000;
      }
      const failure = new Error(
        'Petrux AI could not complete a live web search. Please try again shortly. ' +
        `Details: ${e.message}`
      );
      failure.status = e.status || 502;
      throw failure;
    }
  }
  if (GROQ_API_KEY && Date.now() >= groqBlockedUntil) {
    try {
      const result = await groq(
        messages,
        false,
        max
      );
      cache.set(key, {
        result,
        expires: Date.now() + 300000
      });
      if (cache.size > 200) {
        cache.delete(cache.keys().next().value);
      }
      return result;
    } catch (e) {
      console.error('Groq error:', e.message);
      if (e.status === 429) {
        groqBlockedUntil =
          Date.now() + (e.retryAfterMs || 900000) + 10000;
        console.log(
          `Groq temporarily blocked until: ${new Date(groqBlockedUntil).toISOString()}`
        );
      }
    }
  }
  if (GEMINI_API_KEY) {
    try {
      const result = await gemini(
        messages,
        max
      );
      cache.set(key, {
        result,
        expires: Date.now() + 300000
      });
      return result;
    } catch (e) {
      console.error('Gemini error:', e.message);
    }
  }
  const e = new Error(
    'Petrux AI is temporarily unable to respond. Check your API keys or try again later.'
  );
  e.status = 503;
  throw e;
}
/* ================================
   STATUS
================================ */
app.get('/api/status', (req, res) => {
  res.json({
    name: 'Petrux AI',
    online: true,
    providers: {
      groq: !!GROQ_API_KEY,
      gemini: !!GEMINI_API_KEY
    },
    webSearch: {
      enabled: !!GROQ_API_KEY &&
        BROWSER_SEARCH_MODELS.includes(GROQ_MODEL),
      provider: 'Groq Browser Search',
      model: GROQ_MODEL
    },
    subscription: {
      enabled: !!(PAYSTACK_SECRET_KEY && PRO_TOKEN_SECRET),
      price: 1200,
      currency: 'NGN',
      durationDays: 7
    },
    creator: 'Peter Oriorowho'
  });
});
/* ================================
   CHAT
================================ */
app.post('/api/chat', async (req, res) => {
  const started = Date.now();
  try {
    console.log('--------------------------------');
    console.log('CHAT REQUEST RECEIVED');
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
    console.log(
      `Message: ${messages.at(-1)?.content.slice(0, 100)}`
    );
    const research =
      req.body.research === true;
    console.log(
      `Research requested: ${research}`
    );
    console.log('Generating response...');
    const result = await generate(
      messages,
      900,
      research
    );
    console.log(`Response generated by: ${result.provider}`);
    console.log(`Web search used: ${result.searched}`);
    console.log(`Request completed in ${Date.now() - started}ms`);
    console.log('--------------------------------');
    res.json(result);
  } catch (e) {
    console.error('CHAT ERROR:', e.message);
    console.log(
      `Request failed after ${Date.now() - started}ms`
    );
    error(res, e, 'Petrux AI could not respond.');
  }
});
/* ================================
   STREAMING CHAT
================================ */
app.post('/api/chat/stream', async (req, res) => {
  const started = Date.now();
  try {
    console.log('STREAM REQUEST RECEIVED');
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
    const research =
      req.body.research === true;
    const result = await generate(
      messages,
      900,
      research
    );
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    for (const word of result.answer.split(/(\s+)/)) {
      if (res.destroyed) return;
      res.write(
        `data: ${JSON.stringify({ token: word })}\n\n`
      );
    }
    res.write(
      `data: ${JSON.stringify({
        done: true,
        provider: result.provider,
        searched: result.searched,
        sources: result.sources || []
      })}\n\n`
    );
    res.end();
    console.log(
      `Stream completed in ${Date.now() - started}ms`
    );
  } catch (e) {
    console.error('STREAM ERROR:', e.message);
    if (!res.headersSent) {
      return res.status(e.status || 500).json({
        error: e.message
      });
    }
    res.write(
      `data: ${JSON.stringify({ error: e.message })}\n\n`
    );
    res.end();
  }
});
/* ================================
   SONG LAB
================================ */
app.post('/api/song', async (req, res) => {
  try {
    const idea = String(
      req.body.idea ||
      req.body.prompt ||
      req.body.message ||
      ''
    ).trim();
    const genre = String(
      req.body.genre || ''
    ).trim();
    const mood = String(
      req.body.mood || ''
    ).trim();
    const prompt = [
      idea,
      genre ? `Genre: ${genre}` : '',
      mood ? `Mood: ${mood}` : ''
    ].filter(Boolean).join('\n');
    if (!prompt) {
      return res.status(400).json({
        error: 'Describe the song you want.'
      });
    }
    const result = await generate(
      [{
        role: 'user',
        content:
          `Write original song lyrics based on: ${prompt}\n` +
          'Include a title, catchy chorus, verses and natural musical flow. Do not copy existing songs.'
      }],
      1800
    );
    res.json({
      lyrics: result.answer,
      provider: result.provider
    });
  } catch (e) {
    error(res, e, 'Song generation failed.');
  }
});
/* ================================
   PAYSTACK INITIALIZE
   Supports BOTH:
   /api/paystack/initialize
   /api/subscription/initialize
================================ */
app.post(
  [
    '/api/paystack/initialize',
    '/api/subscription/initialize'
  ],
  async (req, res) => {
    try {
      const email = String(
        req.body.email || ''
      ).trim().toLowerCase();
      if (!emailOK(email)) {
        return res.status(400).json({
          error: 'Enter a valid email address.'
        });
      }
      if (!PAYSTACK_SECRET_KEY || !PRO_TOKEN_SECRET) {
        return res.status(503).json({
          error: 'Payment system is not configured.'
        });
      }
      const reference =
        `PETRUX_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const p = await paystack(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            amount: PRICE,
            currency: 'NGN',
            reference,
            callback_url:
              `${appURL(req)}/api/subscription/callback`,
            metadata: {
              plan: PLAN,
              product: 'Petrux AI Pro',
              duration_days: 7
            }
          })
        }
      );
      if (
        typeof p.authorization_url !== 'string' ||
        !/^https:\/\/checkout\.paystack\.com\//i.test(p.authorization_url)
      ) {
        throw new Error(
          'Paystack did not return a valid checkout address.'
        );
      }
      res.json({
        success: true,
        authorization_url: p.authorization_url,
        access_code: p.access_code,
        reference: p.reference
      });
    } catch (e) {
      error(res, e, 'Could not initialize payment.');
    }
  }
);
/* ================================
   PAYSTACK VERIFY
   Supports BOTH:
   /api/paystack/verify
   /api/subscription/verify
================================ */
app.post(
  [
    '/api/paystack/verify',
    '/api/subscription/verify'
  ],
  async (req, res) => {
    try {
      const p = await verifyPayment(
        String(req.body.reference || '').trim()
      );
      const token = createToken(
        p.customer.email,
        p.reference,
        p.paid_at
      );
      const time = p.paid_at
        ? Date.parse(p.paid_at)
        : Date.now();
      res.json({
        success: true,
        verified: true,
        message: 'Petrux Pro activated successfully.',
        token,
        email: p.customer.email,
        expires_at: new Date(time + DURATION).toISOString()
      });
    } catch (e) {
      error(res, e, 'Payment verification failed.');
    }
  }
);
/* ================================
   PAYSTACK CALLBACK
================================ */
app.get('/api/subscription/callback', async (req, res) => {
  try {
    const ref = String(
      req.query.reference || ''
    ).trim();
    if (!ref) {
      return paymentPage(
        res,
        false,
        '',
        'No payment reference was received.'
      );
    }
    const p = await verifyPayment(ref);
    return paymentPage(
      res,
      true,
      createToken(
        p.customer.email,
        p.reference,
        p.paid_at
      ),
      'Payment successful.'
    );
  } catch (e) {
    console.error('Paystack callback:', e.message);
    return paymentPage(
      res,
      false,
      '',
      'We could not confirm your payment. Contact support if money was deducted.'
    );
  }
});
/* ================================
   SUBSCRIPTION STATUS
================================ */
app.get('/api/subscription/status', (req, res) => {
  const p = verifyToken(bearer(req));
  if (!p) {
    return res.json({
      active: false,
      pro: false
    });
  }
  res.json({
    active: true,
    pro: true,
    email: p.email,
    expires_at: new Date(p.exp).toISOString(),
    days_remaining: Math.max(
      0,
      Math.ceil((p.exp - Date.now()) / 86400000)
    )
  });
});
/* ================================
   PRO FEATURES
================================ */
app.post(
  ['/api/image', '/api/images'],
  requirePro,
  async (req, res) => {
    res.status(501).json({
      error:
        'Image generation provider is not connected yet. Your Pro access is active.'
    });
  }
);
app.post('/api/song-audio', requirePro, async (req, res) => {
  res.status(501).json({
    error:
      'Music generation provider is not connected yet. Your Pro access is active.'
  });
});
/* ================================
   HEALTH CHECK
================================ */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Petrux AI'
  });
});
/* ================================
   WEBSITE FALLBACK
================================ */
app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api/')
  ) {
    return next();
  }
  res.sendFile(
    path.join(__dirname, 'public', 'index.html'),
    e => {
      if (e && !res.headersSent) {
        res.status(404).send('Petrux AI website not found.');
      }
    }
  );
});
/* ================================
   ERROR HANDLER
================================ */
app.use((e, req, res, next) => {
  console.error('SERVER ERROR:', e);
  if (res.headersSent) {
    return next(e);
  }
  res.status(e.status || 500).json({
    error:
      e.status === 400
        ? 'Invalid request.'
        : 'An internal server error occurred.'
  });
});
/* ================================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log('================================');
  console.log('PETRUX AI ONLINE');
  console.log(`Port: ${PORT}`);
  console.log(`Groq: ${GROQ_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Gemini: ${GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Paystack: ${PAYSTACK_SECRET_KEY ? 'Configured' : 'Missing'}`);
  console.log(
    `Web Search: ${
      GROQ_API_KEY && BROWSER_SEARCH_MODELS.includes(GROQ_MODEL)
        ? 'Groq Browser Search enabled'
        : 'Unavailable - check GROQ_MODEL and GROQ_API_KEY'
    }`
  );
  console.log(`AI Timeout: ${TIMEOUT / 1000} seconds`);
  console.log('Pro: ₦1,200 / 7 days');
  console.log('Creator: Peter Oriorowho');
  console.log('================================');
});
