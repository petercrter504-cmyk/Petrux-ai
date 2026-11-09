const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

app.use(express.json({ limit: '1mb' }));

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);

const SYSTEM_PROMPT = `
You are Petrux AI, a friendly and helpful AI assistant.

Your creator is Peter Oriorowho.
Always spell his name exactly: Peter Oriorowho.

If asked who created you, say Peter Oriorowho created you.

Answer naturally and helpfully.
Never pretend to have searched the internet.
`;

app.get('/api/status', function (req, res) {
  res.json({
    online: true,
    name: 'Petrux AI',
    provider: GROQ_API_KEY
      ? 'Groq'
      : 'Not configured'
  });
});

app.post(
  '/api/chat',
  async function (req, res) {
    try {
      const messages =
        Array.isArray(req.body.messages)
          ? req.body.messages
          : [
              {
                role: 'user',
                content: String(
                  req.body.message || ''
                )
              }
            ];

      const cleanMessages = messages
        .filter(function (message) {
          return (
            message &&
            ['user', 'assistant'].includes(
              message.role
            ) &&
            typeof message.content ===
              'string' &&
            message.content.trim()
          );
        })
        .slice(-10);

      if (!cleanMessages.length) {
        return res.status(400).json({
          error: 'Please enter a message.'
        });
      }

      if (!GROQ_API_KEY) {
        return res.status(503).json({
          error:
            'GROQ_API_KEY is not configured.'
        });
      }

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${GROQ_API_KEY}`,
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT
              },
              ...cleanMessages
            ],
            temperature: 0.7,
            max_completion_tokens: 1000
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          'Groq error:',
          data
        );

        return res.status(
          response.status
        ).json({
          error:
            data.error?.message ||
            'AI service returned an error.'
        });
      }

      const answer =
        data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(
          'Petrux AI returned an empty response.'
        );
      }

      res.json({
        answer: answer.trim()
      });
    } catch (error) {
      console.error(
        'Chat error:',
        error
      );

      res.status(500).json({
        error:
          error.message ||
          'Petrux AI could not respond.'
      });
    }
  }
);

app.get('*', function (req, res) {
  res.sendFile(
    path.join(
      __dirname,
      'public',
      'index.html'
    )
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
