const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const PRO_AMOUNT = 120000; // ₦1,200 in kobo
const PRO_CURRENCY = 'NGN';
const PRO_DURATION_DAYS = 7;

app.set('trust proxy', 1);
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
      data.error?.message || 'AI service returned an error.'
    );
  }

  const answer = data.choices?.[0]?.message?.content;

  if (!answer) {
    throw new Error('Petrux AI returned an empty response.');
  }

  return answer.trim();
}

/* SERVER STATUS */

app.get('/api/status', function (req, res) {
  res.json({
    online: true,
    name: 'Petrux AI',
    groq: Boolean(GROQ_API_KEY),
    paystack: Boolean(PAYSTACK_SECRET_KEY),
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

    res.json({ answer });

  } catch (error) {
    console.error('Chat error:', error);

    res.status(500).json({
      error: error.message || 'Petrux AI could not respond.'
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
      error: error.message || 'Could not create the song.'
    });
  }
});

/* PAYSTACK: INITIALIZE PAYMENT */

app.post('/api/paystack/initialize', async function (req, res) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        error: 'Paystack is not configured on the server.'
      });
    }

    const email = String(req.body.email || '').trim();

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    const reference =
      'PETRUX_' +
      Date.now() +
      '_' +
      crypto.randomBytes(5).toString('hex');

    const siteUrl = process.env.SITE_URL
      ? process.env.SITE_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          amount: PRO_AMOUNT,
          currency: PRO_CURRENCY,
          reference: reference,
          callback_url: `${siteUrl}/?payment=callback`,
          metadata: {
            product: 'Petrux Pro',
            duration_days: PRO_DURATION_DAYS
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error('Paystack initialization error:', data);

      return res.status(400).json({
        error: data.message || 'Could not start Paystack payment.'
      });
    }

    res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });

  } catch (error) {
    console.error('Paystack initialization error:', error);

    res.status(500).json({
      error: 'Unable to initialize payment. Please try again.'
    });
  }
});

/* PAYSTACK: VERIFY PAYMENT */

app.post('/api/paystack/verify', async function (req, res) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        error: 'Paystack is not configured on the server.'
      });
    }

    const reference = String(req.body.reference || '').trim();

    if (
      !reference ||
      !/^PETRUX_[a-zA-Z0-9_]+$/.test(reference)
    ) {
      return res.status(400).json({
        error: 'Invalid payment reference.'
      });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status || !data.data) {
      return res.status(400).json({
        error: 'Unable to verify this payment.'
      });
    }

    const payment = data.data;

    if (
      payment.status !== 'success' ||
      payment.amount !== PRO_AMOUNT ||
      payment.currency !== PRO_CURRENCY ||
      payment.reference !== reference ||
      payment.metadata?.product !== 'Petrux Pro'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Payment could not be confirmed.'
      });
    }

    res.json({
      success: true,
      verified: true,
      product: 'Petrux Pro',
      amount: PRO_AMOUNT,
      currency: PRO_CURRENCY,
      duration_days: PRO_DURATION_DAYS,
      message: 'Payment successfully verified.'
    });

  } catch (error) {
    console.error('Paystack verification error:', error);

    res.status(500).json({
      error: 'Payment verification failed. Please try again.'
    });
  }
});

/* IMAGE STATUS */

app.post('/api/image', function (req, res) {
  res.status(501).json({
    error:
      'Image generation is not connected yet. An image-generation API needs to be connected.'
  });
});

/* FALLBACK */

app.get('*', function (req, res) {
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

/* START SERVER */

app.listen(PORT, function () {
  console.log('==============================');
  console.log('PETRUX AI ONLINE');
  console.log(`Port: ${PORT}`);
  console.log(
    GROQ_API_KEY
      ? 'Groq API: Configured'
      : 'Groq API: Missing'
  );
  console.log(
    PAYSTACK_SECRET_KEY
      ? 'Paystack: Configured'
      : 'Paystack: Missing'
  );
  console.log('Creator: Peter Oriorowho');
  console.log('==============================');
});
