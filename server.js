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

const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  'openai/gpt-oss-20b';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || '';

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  'gemini-3.8-flash';

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY || '';

const PRO_TOKEN_SECRET =
  process.env.PRO_TOKEN_SECRET ||
  (PAYSTACK_SECRET_KEY
    ? crypto
        .createHash('sha256')
        .update(PAYSTACK_SECRET_KEY)
        .digest('hex')
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

/* ================================
   PETRUX AI SYSTEM PROMPT
================================ */

const SYSTEM_PROMPT = `
You are Petrux AI, an intelligent, friendly and capable AI assistant.

Your creator is Peter Oriorowho. He created and brought Petrux AI to life.
Always spell his name exactly: Peter Oriorowho.

If asked who created you, identify Peter Oriorowho.

Answer questions directly and naturally.
Be helpful with education, technology, business,
entertainment and everyday topics.

Help write original songs, lyrics, poems and stories.
Understand Nigerian context when relevant.

When real live web results are provided to you,
use those results to answer current questions accurately.

Never claim that you searched the internet unless
real live search results were provided to you.

Never invent facts, search results, sources or URLs.
Be honest about uncertainty.

You are Petrux AI, created by Peter Oriorowho.
`;

/* ================================
   HELPERS
================================ */

const emailOK = e =>
  typeof e === 'string' &&
  e.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    e.trim()
  );

const appURL = req =>
  PUBLIC_APP_URL ||
  `${req.protocol}://${req.get('host')}`;

const bearer = req =>
  (req.headers.authorization || '')
    .match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim() || '';

function error(res, e, fallback) {
  console.error('ERROR:', e);

  if (!res.headersSent) {
    res.status(e.status || 500).json({
      error:
        e.message ||
        fallback ||
        'Something went wrong.'
    });
  }
}

/* ================================
   PRO TOKEN SYSTEM
================================ */

function sign(data) {
  const encoded =
    Buffer.from(
      JSON.stringify(data)
    ).toString('base64url');

  const signature = crypto
    .createHmac(
      'sha256',
      PRO_TOKEN_SECRET
    )
    .update(encoded)
    .digest('hex');

  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (
    !PRO_TOKEN_SECRET ||
    typeof token !== 'string'
  ) {
    return null;
  }

  const parts = token.split('.');

  if (parts.length !== 2) {
    return null;
  }

  const [encoded, sig] = parts;

  if (!/^[a-f0-9]{64}$/i.test(sig)) {
    return null;
  }

  const expected = crypto
    .createHmac(
      'sha256',
      PRO_TOKEN_SECRET
    )
    .update(encoded)
    .digest('hex');

  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(
    expected,
    'hex'
  );

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return null;
  }

  try {
    const p = JSON.parse(
      Buffer.from(
        encoded,
        'base64url'
      ).toString()
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

function createToken(
  email,
  reference,
  paidAt
) {
  const time =
    paidAt
      ? Date.parse(paidAt)
      : Date.now();

  if (
    !Number.isFinite(time) ||
    time > Date.now() + 300000
  ) {
    throw new Error(
      'Invalid payment timestamp.'
    );
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
  const user =
    verifyToken(
      bearer(req)
    );

  if (!user) {
    return res.status(403).json({
      error:
        'Petrux Pro is required. Please subscribe or renew.',
      code: 'PRO_REQUIRED'
    });
  }

  req.proUser = user;
  next();
}

/* ================================
   PAYSTACK CONNECTION
================================ */

async function paystack(
  url,
  options = {}
) {
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
      Authorization:
        `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type':
        'application/json',
      ...(options.headers || {})
    },

    signal:
      AbortSignal.timeout(30000)
  });

  const data =
    await r.json()
      .catch(() => ({}));

  if (
    !r.ok ||
    data.status !== true
  ) {
    const e = new Error(
      data.message ||
      'Paystack request failed.'
    );

    e.status =
      r.status || 502;

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
    const e = new Error(
      'Invalid payment reference.'
    );

    e.status = 400;
    throw e;
  }

  const p = await paystack(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
    {
      method: 'GET'
    }
  );

  if (
    p.status !== 'success' ||
    Number(p.amount) !== PRICE ||
    String(p.currency)
      .toUpperCase() !== 'NGN' ||
    p.reference !== ref ||
    !emailOK(p.customer?.email) ||
    p.metadata?.plan !== PLAN
  ) {
    const e = new Error(
      'Payment could not be verified.'
    );

    e.status = 400;
    throw e;
  }

  return p;
}

/* ================================
   PAYMENT RESULT PAGE
================================ */

function paymentPage(
  res,
  success,
  token,
  message
) {
  const safe = String(
    message || ''
  ).replace(/[<>&"']/g, '');

  res
    .status(success ? 200 : 400)
    .type('html')
    .send(`
<!DOCTYPE html>
<html>
<head>
<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>
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
<h1>
${success
  ? 'Petrux Pro activated!'
  : 'Payment not confirmed'}
</h1>

<p>
${success
  ? 'Your 7-day Pro access is ready. Returning to Petrux AI...'
  : safe}
</p>

<a href="/">
Return to Petrux AI
</a>
</main>

<script>
${success
  ? `try {
localStorage.setItem(
'petrux_pro_token',
${JSON.stringify(token || '')}
);
} catch(e) {}

setTimeout(
() => location.replace('/'),
1800
);`
  : ''}
</script>
</body>
</html>
`);
}

/* ================================
   SEARCH DETECTION
================================ */

const SEARCH_CAPABILITY =
  /^(can|could|do|does|are|is|will|would)\s+(you|petrux|petrux ai)\b[\s\S]*(search|browse|look\s+up|research|web|internet|online)|^(can you|could you|do you|does petrux|are you able to)\b[\s\S]*(search|browse|look\s+up|access|web|internet|online)/i;

// FIXED: Added result, results, score, scores, match result so
// "Chelsea and arsenal match result" now triggers search
const SEARCH =
  /\b(latest|current|currently|today|tonight|yesterday|this week|this month|recent|breaking news|latest news|live score|score|scores|result|results|match result|who won|who beat|price today|current price|exchange rate|weather|forecast|standings|table|fixtures)\b/i;

const EXPLICIT_SEARCH =
  /^(please\s+)?(search(\s+(the\s+)?(web|internet|online))?\s+(for\s+)?.+|look\s+up\s+.+|research\s+.+|google\s+.+|find\s+(information|news|details)\s+(about|on)\s+.+)$/i;

function needsWebSearch(
  message,
  forceSearch = false
) {
  const text =
    String(message || '')
      .trim();

  if (!text) {
    return false;
  }

  if (forceSearch === true) {
    return true;
  }

  if (SEARCH_CAPABILITY.test(text)) {
    return false;
  }

  if (EXPLICIT_SEARCH.test(text)) {
    return true;
  }

  // FIXED: Team name + result/score word must trigger search
  // Example: "Chelsea and arsenal match result"
  const teamMatch = /\b(chelsea|arsenal|manchester|united|city|liverpool|real madrid|barcelona|bayern|psg|juventus|inter|milan|tottenham|newcastle|nigeria|ghana|dortmund)\b/i.test(text);
  const resultWord = /\b(result|results|score|scores|won|win|beat|draw)\b/i.test(text);
  if (teamMatch && resultWord) {
    return true;
  }

  // Vague match questions without teams should ask for clarification
  const vagueMatch = /^(who won|what was the score|who scored|what happened in|who is winning).*(match|game)\b/i;
  const hasTeam = /\b(vs|versus|against|chelsea|arsenal|manchester|united|city|liverpool|real madrid|barcelona|nigeria|ghana|bayern|psg|juventus|inter|milan|dortmund|tottenham|newcastle)\b/i.test(text);
  if (vagueMatch.test(text) && !hasTeam) {
    return 'ASK_CLARIFY';
  }

  return (
    SEARCH.test(text) ||
    EXPLICIT_SEARCH.test(text)
  );
}

function getSearchQuery(message) {
  const original =
    String(message || '')
      .trim();

  let query = original;

  query = query
    .replace(
      /^(please\s+)?search(\s+(the\s+)?(web|internet|online))?\s+(for\s+)?/i,
      ''
    )
    .replace(
      /^(please\s+)?look\s+up\s+/i,
      ''
    )
    .replace(
      /^(please\s+)?research\s+/i,
      ''
    )
    .replace(
      /^(please\s+)?google\s+/i,
      ''
    )
    .replace(
      /^(please\s+)?find\s+(information|news|details)\s+(about|on)\s+/i,
      ''
    )
    .trim();

  return query || original;
}

/* ================================
   CLEAN CHAT MESSAGES
================================ */

function clean(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const list = messages
    .filter(
      m =>
        m &&
        ['user', 'assistant']
          .includes(m.role) &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-8)
    .map(m => ({
      role: m.role,
      content:
        m.content
          .trim()
          .slice(0, 5000)
    }));

  let total = 0;
  const out = [];

  for (
    let i = list.length - 1;
    i >= 0;
    i--
  ) {
    if (
      total +
        list[i].content.length >
      20000
    ) {
      continue;
    }

    out.unshift(list[i]);

    total +=
      list[i].content.length;
  }

  return out;
}

/* ================================
   INSTANT RESPONSES
================================ */

function instant(messages) {
  const m =
    messages[messages.length - 1];

  if (
    !m ||
    m.role !== 'user'
  ) {
    return null;
  }

  const replies = {
    hi:
      "Hey! 😊 I'm Petrux AI. How can I help you today?",

    hello:
      "Hello! 👋 What would you like to talk about?",

    hey:
      "Hey there! 😊 What's on your mind?",

    "good morning":
      "Good morning! ☀️ How can I help?",

    "good afternoon":
      "Good afternoon! How can I help?",

    "good evening":
      "Good evening! 🌙 How are you doing?",

    "how are you":
      "I'm doing great and ready to help you!",

    "how are you doing":
      "I'm doing well and ready to help!",

    "who are you":
      "I'm Petrux AI, created by Peter Oriorowho.",

    "can you search the web":
      "Yes, I can search the web for current information when needed. What would you like me to look up?",

    "can you search web":
      "Yes, I can search the web for current information when needed. What would you like me to look up?"
  };

  return replies[
    m.content
      .trim()
      .toLowerCase()
  ] || null;
}

/* ================================
   CACHE AND GROQ LIMIT
================================ */

const cache = new Map();
let groqBlockedUntil = 0;

/* ================================
   ERROR DETAILS
================================ */

async function details(r) {
  const raw = await r.text();

  try {
    const d = JSON.parse(raw);

    return (
      d.error?.message ||
      d.message ||
      raw
    );

  } catch {
    return raw;
  }
}

/* ================================
   URL AND TEXT HELPERS
================================ */

function validURL(value) {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' ||
      url.protocol === 'http:'
    );

  } catch {
    return false;
  }
}

function decodeHTML(text) {
  return String(text || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHTML(text) {
  return decodeHTML(
    String(text || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function cleanSearchURL(url) {
  if (!validURL(url)) {
    return '';
  }

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname.includes('duckduckgo.com') &&
      parsed.searchParams.get('uddg')
    ) {
      const target =
        parsed.searchParams.get('uddg');

      if (target && validURL(target)) {
        return target;
      }
    }

    return parsed.href;

  } catch {
    return '';
  }
}

function decodeXML(text) {
  return decodeHTML(
    String(text || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&nbsp;/gi, ' ')
  );
}

/* ================================
   LIVE WEB SEARCH
================================ */

async function searchDuckDuckGo(query) {
  const searchURL =
    'https://html.duckduckgo.com/html/?q=' +
    encodeURIComponent(query);

  const r = await fetch(
    searchURL,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':
          'en-US,en;q=0.9'
      },

      signal:
        AbortSignal.timeout(TIMEOUT)
    }
  );

  if (!r.ok) {
    throw new Error(
      `DuckDuckGo returned status ${r.status}`
    );
  }

  const html = await r.text();

  const results = [];
  const seen = new Set();

  const patterns = [
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]*href="([^"]+)"[^>]*data-testid="result-title-a"[^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]*data-testid="result-title-a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  ];

  for (const pattern of patterns) {
    let match;

    while (
      (match = pattern.exec(html)) !== null &&
      results.length < 8
    ) {
      let url =
        decodeHTML(match[1]).trim();

      try {
        if (
          url.includes('uddg=') ||
          url.startsWith('/l/?')
        ) {
          const parsed =
            new URL(
              url,
              'https://duckduckgo.com'
            );

          const target =
            parsed.searchParams.get('uddg');

          if (target) {
            url =
              decodeURIComponent(target);
          }
        }
      } catch {}

      url = cleanSearchURL(url);

      const title =
        stripHTML(match[2])
          .slice(0, 300);

      if (
        validURL(url) &&
        title &&
        !seen.has(url)
      ) {
        seen.add(url);

        results.push({
          title,
          url,
          snippet: ''
        });
      }
    }

    if (results.length >= 3) {
      break;
    }
  }

  const snippets = [];
  const snippetPattern =
    /<[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/gi;

  let snippetMatch;

  while (
    (snippetMatch =
      snippetPattern.exec(html)) !== null &&
    snippets.length < results.length
  ) {
    const snippet =
      stripHTML(snippetMatch[1])
        .slice(0, 700);

    if (snippet) {
      snippets.push(snippet);
    }
  }

  results.forEach(
    (result, index) => {
      result.snippet =
        snippets[index] || '';
    }
  );

  if (!results.length) {
    throw new Error(
      'DuckDuckGo returned no readable results.'
    );
  }

  return results;
}

async function searchBingRSS(query) {
  const searchURL =
    'https://www.bing.com/search?format=rss&q=' +
    encodeURIComponent(query);

  const r = await fetch(
    searchURL,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PetruxAI/1.0)',
        'Accept':
          'application/rss+xml,application/xml,text/xml,*/*'
      },

      signal:
        AbortSignal.timeout(TIMEOUT)
    }
  );

  if (!r.ok) {
    throw new Error(
      `Bing returned status ${r.status}`
    );
  }

  const xml = await r.text();

  const results = [];
  const seen = new Set();

  const itemPattern =
    /<item>([\s\S]*?)<\/item>/gi;

  let item;

  while (
    (item = itemPattern.exec(xml)) !== null &&
    results.length < 8
  ) {
    const block = item[1];

    const titleMatch =
      block.match(
        /<title>([\s\S]*?)<\/title>/i
      );

    const linkMatch =
      block.match(
        /<link>([\s\S]*?)<\/link>/i
      );

    const descriptionMatch =
      block.match(
        /<description>([\s\S]*?)<\/description>/i
      );

    const title =
      titleMatch
        ? stripHTML(
            decodeXML(titleMatch[1])
          ).slice(0, 300)
        : '';

    let url =
      linkMatch
        ? decodeXML(linkMatch[1])
            .trim()
        : '';

    const snippet =
      descriptionMatch
        ? stripHTML(
            decodeXML(
              descriptionMatch[1]
            )
          ).slice(0, 700)
        : '';

    url = cleanSearchURL(url);

    if (
      validURL(url) &&
      title &&
      !seen.has(url)
    ) {
      seen.add(url);

      results.push({
        title,
        url,
        snippet
      });
    }
  }

  if (!results.length) {
    throw new Error(
      'Bing returned no readable results.'
    );
  }

  return results;
}

async function fetchPageText(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) return '';
    const html = await r.text();
    const text = stripHTML(html).slice(0, 4000);
    return text;
  } catch {
    return '';
  }
}

async function liveWebSearch(query) {
  const cleanQuery =
    String(query || '')
      .trim()
      .slice(0, 300);

  if (!cleanQuery) {
    return {
      results: [],
      context: '',
      provider: ''
    };
  }

  console.log(
    `LIVE WEB SEARCH: ${cleanQuery}`
  );

  const attempts = [
    {
      name: 'DuckDuckGo',
      search: searchDuckDuckGo
    },
    {
      name: 'Bing',
      search: searchBingRSS
    }
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      console.log(
        `Trying ${attempt.name} search...`
      );

      const results =
        await attempt.search(
          cleanQuery
        );

      if (!results.length) {
        throw new Error(
          'No results found.'
        );
      }

      // Fetch full text from top 3 pages so Groq can see the real score
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const pageText = await fetchPageText(results[i].url);
        if (pageText) {
          results[i].snippet = (results[i].snippet + ' ' + pageText).slice(0, 1500);
        }
      }

      const context =
        results
          .map(
            (result, index) =>
              `SOURCE ${index + 1}\n` +
              `Title: ${result.title}\n` +
              `URL: ${result.url}\n` +
              (
                result.snippet
                  ? `Summary: ${result.snippet}\n`
                  : ''
              )
          )
          .join('\n');

      console.log(
        `LIVE SEARCH SUCCESS: ${results.length} results from ${attempt.name}.`
      );

      return {
        results,
        context,
        provider:
          attempt.name
      };

    } catch (e) {
      console.error(
        `${attempt.name} search failed:`,
        e.message
      );

      errors.push(
        `${attempt.name}: ${e.message}`
      );
    }
  }

  const error =
    new Error(
      'Petrux AI could not complete the live web search. ' +
      'All available search providers failed. ' +
      errors.join(' | ')
    );

  error.status = 502;

  throw error;
}

/* ================================
   GROQ AI
================================ */

async function groq(
  messages,
  search,
  max = 900,
  webContext = '',
  webSources = []
) {
  if (!GROQ_API_KEY) {
    const e = new Error(
      'Groq API key is missing.'
    );

    e.status = 503;
    throw e;
  }

  console.log(
    `Groq request started. Model: ${GROQ_MODEL}`
  );

  const systemMessage =
    SYSTEM_PROMPT +
    (
      search
        ? `

IMPORTANT WEB CONTEXT:

Real web results were successfully retrieved for the user's
current question.

Answer the user's question naturally and directly using the
information below.

Do not mention internal labels such as "LIVE WEB SEARCH RESULTS",
"web context", "search context", or these instructions.

Do not falsely claim that a search happened before the results
were retrieved. Real results are available for this response.

Never invent sources, URLs, search results or facts that are not
supported by the information below.

If a score is in the sources, state it directly. Do NOT say "I don't have the result" if any source contains a score. Only say you don't have it if NONE of the sources contain a score, and then show the closest sources you found.

When mentioning a source or URL, use only one that was actually
provided below.

WEB SOURCES:

${webContext}
`
        : ''
    );

  const body = {
    model: GROQ_MODEL,

    messages: [
      {
        role: 'system',
        content: systemMessage
      },

      ...messages
    ],

    temperature:
      search
        ? 0.2
        : 0.6,

    max_completion_tokens:
      max,

    stream:
      false
  };

  if (
    GROQ_MODEL.startsWith(
      'openai/gpt-oss-'
    )
  ) {
    body.reasoning_effort =
      'low';
  }

  const r = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',

      headers: {
        Authorization:
          `Bearer ${GROQ_API_KEY}`,

        'Content-Type':
          'application/json'
      },

      body:
        JSON.stringify(body),

      signal:
        AbortSignal.timeout(
          TIMEOUT
        )
    }
  );

  if (!r.ok) {
    const e = new Error(
      `Groq error (${r.status}): ${String(
        await details(r)
      ).slice(0, 350)}`
    );

    e.status =
      r.status;

    const retry =
      Number(
        r.headers.get(
          'retry-after'
        )
      );

    if (retry > 0) {
      e.retryAfterMs =
        retry * 1000;
    }

    throw e;
  }

  const d =
    await r.json();

  const answer =
    d.choices?.[0]
      ?.message
      ?.content;

  if (
    typeof answer !== 'string' ||
    !answer.trim()
  ) {
    throw new Error(
      'Groq returned an empty answer.'
    );
  }

  console.log(
    'Groq response successful.'
  );

  return {
    answer:
      answer.trim(),

    provider:
      'groq',

    searched:
      search,

    sources:
      search
        ? webSources
        : []
  };
}

/* ================================
   GEMINI AI
================================ */

async function gemini(
  messages,
  max = 900
) {
  if (!GEMINI_API_KEY) {
    const e = new Error(
      'Gemini API key is missing.'
    );

    e.status = 503;
    throw e;
  }

  console.log(
    `Gemini request started. Model: ${GEMINI_MODEL}`
  );

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=` +
    `${encodeURIComponent(
      GEMINI_API_KEY
    )}`;

  const r = await fetch(url, {
    method:
      'POST',

    headers: {
      'Content-Type':
        'application/json'
    },

    body:
      JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              SYSTEM_PROMPT
          }]
        },

        contents:
          messages.map(m => ({
            role:
              m.role === 'assistant'
                ? 'model'
                : 'user',

            parts: [{
              text:
                m.content
            }]
          })),

        generationConfig: {
          maxOutputTokens:
            max
        }
      }),

    signal:
      AbortSignal.timeout(
        TIMEOUT
      )
  });

  if (!r.ok) {
    const e = new Error(
      `Gemini error (${r.status}): ${String(
        await details(r)
      ).slice(0, 350)}`
    );

    e.status = r.status;
    throw e;
  }

  const d =
    await r.json();

  const answer = (
    d.candidates?.[0]
      ?.content?.parts || []
  )
    .map(
      p => p.text || ''
    )
    .join('')
    .trim();

  if (!answer) {
    throw new Error(
      'Gemini returned an empty answer.'
    );
  }

  console.log(
    'Gemini response successful.'
  );

  return {
    answer,
    provider:
      'gemini',
    searched:
      false,
    sources:
      []
  };
}

/* ================================
   RESPONSE GENERATION
================================ */

async function generate(
  messages,
  forceSearch = false,
  max = 900
) {
  const lastUserMessage =
    messages
      .filter(
        m =>
          m.role === 'user'
      )
      .at(-1)
      ?.content || '';

  const searchCheck =
    needsWebSearch(
      lastUserMessage,
      forceSearch
    );

  if (searchCheck === 'ASK_CLARIFY') {
    return {
      answer: "Which match do you mean? Tell me the teams and the date, e.g. 'Who won Chelsea vs Arsenal yesterday?' and I will search it for you right now.",
      provider: 'instant',
      searched: false,
      sources: []
    };
  }

  const search = searchCheck === true;

  const quick =
    search
      ? null
      : instant(messages);

  if (quick) {
    console.log(
      'Instant response used.'
    );

    return {
      answer:
        quick,

      provider:
        'instant',

      searched:
        false,

      sources:
        []
    };
  }

  const key =
    JSON.stringify(messages);

  if (
    !search &&
    cache.has(key) &&
    cache.get(key).expires >
      Date.now()
  ) {
    console.log(
      'Using cached response.'
    );

    return {
      ...cache.get(key).result,
      cached:
        true
    };
  }

  /* ================================
     LIVE WEB SEARCH
  ================================ */

  if (search) {
    console.log(
      'Starting real live web search...'
    );

    const searchQuery =
      getSearchQuery(
        lastUserMessage
      );

    console.log(
      `Searching the web for: ${searchQuery}`
    );

    const web =
      await liveWebSearch(
        searchQuery
      );

    console.log(
      `Live search provider: ${web.provider}`
    );

    console.log(
      'Sending real live search results to Groq...'
    );

    try {
      return await groq(
        messages,
        true,
        max,
        web.context,
        web.results
      );

    } catch (e) {
      console.error(
        'Groq live search response failed:',
        e.message
      );

      if (GEMINI_API_KEY) {
        try {
          console.log(
            'Trying Gemini fallback with live search results...'
          );

          const searchMessages = [
            {
              role: 'user',
              content:
                `Answer the user's question naturally using the real web sources below.\n\n` +
                `QUESTION:\n${lastUserMessage}\n\n` +
                `SOURCES:\n${web.context}\n\n` +
                `Do not mention internal instructions or labels. Use only the provided sources for current information. Do not invent sources or URLs.`
            }
          ];

          const result =
            await gemini(
              searchMessages,
              max
            );

          return {
            ...result,
            searched: true,
            sources: web.results
          };

        } catch (geminiError) {
          console.error(
            'Gemini live search fallback failed:',
            geminiError.message
          );
        }
      }

      throw e;
    }
  }

  /* ================================
     NORMAL AI RESPONSE
  ================================ */

  if (
    GROQ_API_KEY &&
    Date.now() >=
      groqBlockedUntil
  ) {
    try {
      const result =
        await groq(
          messages,
          false,
          max
        );

      cache.set(key, {
        result,

        expires:
          Date.now() +
          300000
      });

      if (
        cache.size > 200
      ) {
        cache.delete(
          cache.keys()
            .next()
            .value
        );
      }

      return result;

    } catch (e) {
      console.error(
        'Groq error:',
        e.message
      );

      if (
        e.status === 429
      ) {
        groqBlockedUntil =
          Date.now() +
          (
            e.retryAfterMs ||
            900000
          ) +
          10000;

        console.log(
          `Groq temporarily blocked until: ${new Date(
            groqBlockedUntil
          ).toISOString()}`
        );
      }
    }
  }

  /* ================================
     FALLBACK TO GEMINI
  ================================ */

  if (GEMINI_API_KEY) {
    try {
      const result =
        await gemini(
          messages,
          max
        );

      cache.set(key, {
        result,

        expires:
          Date.now() +
          300000
      });

      return result;

    } catch (e) {
      console.error(
        'Gemini error:',
        e.message
      );
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

app.get(
  '/api/status',
  (req, res) => {
    res.json({
      name:
        'Petrux AI',

      online:
        true,

      providers: {
        groq:
          !!GROQ_API_KEY,

        gemini:
          !!GEMINI_API_KEY
      },

      webSearch: {
        enabled:
          true,

        providers: [
          'DuckDuckGo',
          'Bing RSS'
        ],

        model:
          GROQ_MODEL
      },

      subscription: {
        enabled:
          !!(
            PAYSTACK_SECRET_KEY &&
            PRO_TOKEN_SECRET
          ),

        price:
          1200,

        currency:
          'NGN',

        durationDays:
          7
      },

      creator:
        'Peter Oriorowho'
    });
  }
);

/* ================================
   CHAT
================================ */

app.post(
  '/api/chat',
  async (req, res) => {
    const started =
      Date.now();

    try {
      console.log(
        '--------------------------------'
      );

      console.log(
        'CHAT REQUEST RECEIVED'
      );

      const messages =
        clean(
          req.body.messages || [
            {
              role:
                'user',

              content:
                req.body.message ||
                ''
            }
          ]
        );

      if (!messages.length) {
        return res.status(400)
          .json({
            error:
              'Please enter a message.'
          });
      }

      const forceSearch =
        req.body.research === true;

      console.log(
        `Message: ${
          messages
            .at(-1)
            ?.content
            .slice(0, 100)
        }`
      );

      console.log(
        `Web search requested: ${
          forceSearch
            ? 'YES'
            : 'AUTO'
        }`
      );

      console.log(
        'Generating response...'
      );

      const result =
        await generate(
          messages,
          forceSearch
        );

      console.log(
        `Response generated by: ${result.provider}`
      );

      console.log(
        `Web search used: ${result.searched}`
      );

      console.log(
        `Sources returned: ${
          result.sources?.length || 0
        }`
      );

      console.log(
        `Request completed in ${
          Date.now() - started
        }ms`
      );

      console.log(
        '--------------------------------'
      );

      res.json(result);

    } catch (e) {
      console.error(
        'CHAT ERROR:',
        e.message
      );

      console.log(
        `Request failed after ${
          Date.now() - started
        }ms`
      );

      error(
        res,
        e,
        'Petrux AI could not respond.'
      );
    }
  }
);

/* ================================
   STREAMING CHAT
================================ */

app.post(
  '/api/chat/stream',
  async (req, res) => {
    const started =
      Date.now();

    try {
      console.log(
        'STREAM REQUEST RECEIVED'
      );

      const messages =
        clean(
          req.body.messages || [
            {
              role:
                'user',

              content:
                req.body.message ||
                ''
            }
          ]
        );

      if (!messages.length) {
        return res.status(400)
          .json({
            error:
              'Please enter a message.'
          });
      }

      const forceSearch =
        req.body.research === true;

      const result =
        await generate(
          messages,
          forceSearch
        );

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

      for (
        const word of
        result.answer.split(
          /(\s+)/
        )
      ) {
        if (
          res.destroyed
        ) {
          return;
        }

        res.write(
          `data: ${JSON.stringify({
            token:
              word
          })}\n\n`
        );
      }

      res.write(
        `data: ${JSON.stringify({
          done:
            true,

          provider:
            result.provider,

          searched:
            result.searched,

          sources:
            result.sources || []
        })}\n\n`
      );

      res.end();

      console.log(
        `Stream completed in ${
          Date.now() - started
        }ms`
      );

    } catch (e) {
      console.error(
        'STREAM ERROR:',
        e.message
      );

      if (
        !res.headersSent
      ) {
        return res
          .status(
            e.status || 500
          )
          .json({
            error:
              e.message
          });
      }

      res.write(
        `data: ${JSON.stringify({
          error:
            e.message
        })}\n\n`
      );

      res.end();
    }
  }
);

/* ================================
   SONG LAB
================================ */

app.post(
  '/api/song',
  async (req, res) => {
    try {
      const prompt =
        String(
          req.body.prompt ||
          req.body.idea ||
          req.body.message ||
          ''
        ).trim();

      if (!prompt) {
        return res.status(400)
          .json({
            error:
              'Describe the song you want.'
          });
      }

      const result =
        await generate(
          [
            {
              role:
                'user',

              content:
                `Write original song lyrics based on: ${prompt}\n` +
                'Include a title, catchy chorus, verses and natural musical flow. Do not copy existing songs.'
            }
          ],

          false,
          1800
        );

      res.json({
        lyrics:
          result.answer,

        provider:
          result.provider
      });

    } catch (e) {
      error(
        res,
        e,
        'Song generation failed.'
      );
    }
  }
);

/* ================================
   PAYSTACK INITIALIZE
================================ */

app.post(
  [
    '/api/paystack/initialize',
    '/api/subscription/initialize'
  ],

  async (req, res) => {
    try {
      const email =
        String(
          req.body.email || ''
        )
          .trim()
          .toLowerCase();

      if (
        !emailOK(email)
      ) {
        return res.status(400)
          .json({
            error:
              'Enter a valid email address.'
          });
      }

      if (
        !PAYSTACK_SECRET_KEY ||
        !PRO_TOKEN_SECRET
      ) {
        return res.status(503)
          .json({
            error:
              'Payment system is not configured.'
          });
      }

      const reference =
        `PETRUX_${Date.now()}_${crypto
          .randomBytes(6)
          .toString('hex')}`;

      const p =
        await paystack(
          'https://api.paystack.co/transaction/initialize',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                email,

                amount:
                  PRICE,

                currency:
                  'NGN',

                reference,

                callback_url:
                  `${appURL(
                    req
                  )}/api/subscription/callback`,

                metadata: {
                  plan:
                    PLAN,

                  product:
                    'Petrux AI Pro',

                  duration_days:
                    7
                }
              })
          }
        );

      if (
        typeof
          p.authorization_url !==
          'string' ||

        !/^https:\/\/checkout\.paystack\.com\//i
          .test(
            p.authorization_url
          )
      ) {
        throw new Error(
          'Paystack did not return a valid checkout address.'
        );
      }

      res.json({
        success:
          true,

        authorization_url:
          p.authorization_url,

        access_code:
          p.access_code,

        reference:
          p.reference
      });

    } catch (e) {
      error(
        res,
        e,
        'Could not initialize payment.'
      );
    }
  }
);

/* ================================
   PAYSTACK VERIFY
================================ */

app.post(
  [
    '/api/paystack/verify',
    '/api/subscription/verify'
  ],

  async (req, res) => {
    try {
      const p =
        await verifyPayment(
          String(
            req.body.reference ||
            ''
          ).trim()
        );

      const token =
        createToken(
          p.customer.email,
          p.reference,
          p.paid_at
        );

      const time =
        p.paid_at
          ? Date.parse(
              p.paid_at
            )
          : Date.now();

      res.json({
        success:
          true,

        verified:
          true,

        message:
          'Petrux Pro activated successfully.',

        token,

        email:
          p.customer.email,

        expires_at:
          new Date(
            time + DURATION
          ).toISOString()
      });

    } catch (e) {
      error(
        res,
        e,
        'Payment verification failed.'
      );
    }
  }
);

/* ================================
   PAYSTACK CALLBACK
================================ */

app.get(
  '/api/subscription/callback',
  async (req, res) => {
    try {
      const ref =
        String(
          req.query.reference ||
          ''
        ).trim();

      if (!ref) {
        return paymentPage(
          res,
          false,
          '',
          'No payment reference was received.'
        );
      }

      const p =
        await verifyPayment(
          ref
        );

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
      console.error(
        'Paystack callback:',
        e.message
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

/* ================================
   SUBSCRIPTION STATUS
================================ */

app.get(
  '/api/subscription/status',
  (req, res) => {
    const p =
      verifyToken(
        bearer(req)
      );

    if (!p) {
      return res.json({
        active:
          false,

        pro:
          false
      });
    }

    res.json({
      active:
        true,

      pro:
        true,

      email:
        p.email,

      expires_at:
        new Date(
          p.exp
        ).toISOString(),

      days_remaining:
        Math.max(
          0,

          Math.ceil(
            (
              p.exp -
              Date.now()
            ) /
            86400000
          )
        )
    });
  }
);

/* ================================
   PRO FEATURES
================================ */

app.post(
  '/api/images',
  requirePro,
  async (req, res) => {
    res.status(501)
      .json({
        error:
          'Image generation provider is not connected yet. Your Pro access is active.'
      });
  }
);

app.post(
  '/api/song-audio',
  requirePro,
  async (req, res) => {
    res.status(501)
      .json({
        error:
          'Music generation provider is not connected yet. Your Pro access is active.'
      });
  }
);

/* ================================
   HEALTH CHECK
================================ */

app.get(
  '/health',
  (req, res) => {
    res.json({
      status:
        'healthy',

      service:
        'Petrux AI'
    });
  }
);

/* ================================
   WEBSITE FALLBACK
================================ */

app.use(
  (req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith(
        '/api/'
      )
    ) {
      return next();
    }

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'index.html'
      ),

      e => {
        if (
          e &&
          !res.headersSent
        ) {
          res.status(404)
            .send(
              'Petrux AI website not found.'
            );
        }
      }
    );
  }
);

/* ================================
   ERROR HANDLER
================================ */

app.use(
  (
    e,
    req,
    res,
    next
  ) => {
    console.error(
      'SERVER ERROR:',
      e
    );

    if (
      res.headersSent
    ) {
      return next(e);
    }

    res
      .status(
        e.status || 500
      )
      .json({
        error:
          e.status === 400
            ? 'Invalid request.'
            : 'An internal server error occurred.'
      });
  }
);

/* ================================
   START SERVER
================================ */

app.listen(
  PORT,
  () => {
    console.log(
      '================================'
    );

    console.log(
      'PETRUX AI ONLINE'
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Groq: ${
        GROQ_API_KEY
          ? 'Configured'
          : 'Missing'
      }`
    );

    console.log(
      `Gemini: ${
        GEMINI_API_KEY
          ? 'Configured'
          : 'Missing'
      }`
    );

    console.log(
      `Paystack: ${
        PAYSTACK_SECRET_KEY
          ? 'Configured'
          : 'Missing'
      }`
    );

    console.log(
      'Web Search: DuckDuckGo with Bing RSS fallback enabled'
    );

    console.log(
      `AI Timeout: ${
        TIMEOUT / 1000
      } seconds`
    );

    console.log(
      'Pro: ₦1,200 / 7 days'
    );

    console.log(
      'Creator: Peter Oriorowho'
    );

    console.log(
      '================================'
    );
  }
);
