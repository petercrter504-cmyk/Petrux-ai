const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const PORT = process.env.PORT || 3000;
const TIMEOUT = 8000;
const CHUNK_SIZE = 14000;
const FETCH_CONCURRENCY = 3;

const cache = new Map();

// ---------- helpers ----------
const cleanSearchURL = (u) => {
  if (!u) return '';
  u = String(u).replace(/&amp;/g, '&');
  const m = u.match(/[?&](?:url|u|q)=([^&]+)/i);
  if (m) { try { return decodeURIComponent(m[1]); } catch {} }
  return u;
};
const validURL = (u) => /^https?:\/\/[^ "]+$/i.test(u || '');
const stripHTML = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const decodeHTML = (s) => String(s || '').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

function instant() {
  return {
    // Greetings - DELETED the "can you search web" lines
    "hello": "Hey! I'm Petrux. What do you want to know?",
    "hi": "Hey! I'm Petrux. What do you want to know?",
    "hey": "Hey! What's up?",
    "good morning": "Good morning! What can I do for you?",
    "good afternoon": "Good afternoon! What can I do for you?",
    "good evening": "Good evening! What can I do for you?",
    "who are you": "I'm Petrux — your AI assistant. I can chat, explain things, and search the web for live info.",
    "what is your name": "I'm Petrux.",
    "how are you": "I'm doing great — ready to help. What do you need?",
    "thank you": "You're welcome! Anything else?",
    "thanks": "You're welcome!",
    "bye": "Bye! Talk soon.",
    "goodbye": "Bye! Talk soon.",
  };
}

// ---------- search query ----------
function getSearchQuery(userMessage) {
  let query = String(userMessage || '').trim();

  // Football: force phrase match so Bing doesn't return "Premier Physical Therapy"
  if (/\bpremier league\b/i.test(query)) {
    query = '"Premier League" football results';
  }

  // Force fresh results
  if (/\b(yesterday|today|latest|recent)\b/i.test(userMessage)) {
    query = query + ' November 2026 Matchweek 10';
  }

  // If user typed a date, keep it
  const dateMatch = userMessage.match(/(\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i);
  if (dateMatch && !query.includes(dateMatch[1])) {
    query = query + ' ' + dateMatch[1];
  }

  return query || String(userMessage || '').trim();
}

function shouldSearch(userMessage) {
  const msg = String(userMessage || '').toLowerCase();
  if (/\b(yesterday|today|latest|recent|now|current|live|result|score|exchange rate|price|news)\b/.test(msg)) return true;
  if (/\b(premier league|football|naira|dollar|epl)\b/.test(msg)) return true;
  if (/^\s*(search|google|find|look up)\b/.test(msg)) return true;
  return false;
}

// ---------- Bing HTML (FIRST - not cached like RSS) ----------
async function searchBingHTML(query) {
  const r = await fetch('https://www.bing.com/search?q=' + encodeURIComponent(query), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html'
    },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!r.ok) throw new Error(`Bing HTML ${r.status}`);
  const html = await r.text();
  const results = [];
  const seen = new Set();
  const re = /<li class="b_algo"[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html)) !== null && results.length < 8) {
    const url = cleanSearchURL(decodeHTML(m[1]));
    const title = stripHTML(m[2]).slice(0,300);
    const snippet = stripHTML(m[3]).slice(0,700);
    if (validURL(url) && title && !seen.has(url)) {
      seen.add(url);
      results.push({ title, url, snippet });
    }
  }
  if (!results.length) throw new Error('Bing HTML returned no results');
  return results;
}

async function searchBingRSS(query) {
  const r = await fetch('https://www.bing.com/search?format=rss&q=' + encodeURIComponent(query), {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!r.ok) throw new Error(`Bing RSS ${r.status}`);
  const xml = await r.text();
  const results = [];
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  for (const it of items) {
    const body = it[1];
    const title = stripHTML((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = cleanSearchURL(stripHTML((body.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || ''));
    const desc = stripHTML((body.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '');
    if (validURL(link) && title) results.push({ title: title.slice(0,300), url: link, snippet: desc.slice(0,700) });
    if (results.length >= 8) break;
  }
  if (!results.length) throw new Error('Bing RSS returned no results');
  return results;
}

async function fetchPageText(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!r.ok) return '';
    const html = await r.text();
    let text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ');
    text = stripHTML(text);
    return text.slice(0, CHUNK_SIZE);
  } catch { return ''; }
}

// ---------- live search ----------
async function liveWebSearch(userMessage) {
  const cleanQuery = getSearchQuery(userMessage);
  console.log(`[Petrux] SEARCH QUERY: "${cleanQuery}"`);

  const attempts = [
    { name: 'Bing HTML', search: searchBingHTML },
    { name: 'Bing RSS', search: searchBingRSS },
  ];

  for (const attempt of attempts) {
    try {
      console.log(`[Petrux] Trying ${attempt.name} search...`);
      let results = await attempt.search(cleanQuery);

      // Drop junk like "Premier Physical Therapy" when searching football
      let filtered = results;
      if (/premier league|football|soccer/i.test(cleanQuery)) {
        const good = results.filter(r =>
          /premier league|football|soccer|arsenal|chelsea|liverpool|manchester|tottenham|villa|brighton|sunderland|palace|hull/i.test((r.title + ' ' + r.snippet).toLowerCase())
        );
        if (good.length > 0) filtered = good;
      }

      const context =
        filtered
          .map((r, i) => `SOURCE ${i+1}\nTitle: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
          .join('\n\n');

      console.log(`[Petrux] Live search provider: ${attempt.name}`);
      console.log(`[Petrux] WEB CONTEXT PREVIEW: ${context.slice(0,1200)}`);

      // Fetch page text for top 2 results
      const pages = [];
      for (let i = 0; i < Math.min(2, filtered.length); i++) {
        const t = await fetchPageText(filtered[i].url);
        if (t) pages.push(`PAGE ${i+1} (${filtered[i].url}):\n${t.slice(0,4000)}`);
      }

      const full = pages.length ? context + '\n\n' + pages.join('\n\n') : context;
      console.log('[Petrux] Sending real live search results to Groq...');
      return { context: full, provider: attempt.name, query: cleanQuery, results: filtered };
    } catch (e) {
      console.log(`[Petrux] ${attempt.name} failed: ${e.message}`);
    }
  }
  return null;
}

// ---------- Groq ----------
async function groq(messages) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

// ---------- main ----------
async function generate(userMessage) {
  const normalized = String(userMessage || '').trim().toLowerCase();
  const inst = instant();
  if (inst[normalized]) {
    console.log('[Petrux] Instant response used.');
    return inst[normalized];
  }

  const needsSearch = shouldSearch(userMessage);
  const search = needsSearch ? await liveWebSearch(userMessage) : null;

  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);

  const system = search
    ? `You are Petrux, a helpful AI assistant. Answer using ONLY the live search results below.

RECENCY RULE - VERY IMPORTANT:
Today is ${today}. Yesterday was ${yesterday}.
Ignore ANY result older than 7 days. October results are STALE, do NOT use them as "latest".
If sources contain both October and November results, use ONLY November results.
Prefer results from the most recent Matchweek (Nov 6-8, 2026).

NEVER say "no match on [date]" if the sources don't prove it. NEVER say a "next fixture" date that is BEFORE the last result date. If dates are confusing, say "Search results are stale" and list what the sources actually say.

When mentioning a source or URL, use only one that was actually provided below.
Keep answer short and clear.`
    : `You are Petrux, a helpful AI assistant. Answer clearly and concisely. Today is ${today}.`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: search ? `Question: ${userMessage}\n\nLIVE SEARCH RESULTS (use these):\n${search.context}` : userMessage }
  ];

  if (!search && cache.has(normalized)) return cache.get(normalized);
  const answer = await groq(messages);
  console.log(`[Petrux] Web search used: ${!!search}`);
  if (!search) cache.set(normalized, answer);
  return answer;
}

app.post('/chat', async (req, res) => {
  try {
    const msg = req.body.message || req.body.prompt || '';
    if (!msg) return res.json({ reply: 'What do you want to ask?' });
    const reply = await generate(msg);
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.json({ reply: 'Sorry, I had a problem. Try again.' });
  }
});

app.get('/', (req, res) => res.send('Petrux is running'));
app.listen(PORT, () => console.log(`Petrux on ${PORT}`));
