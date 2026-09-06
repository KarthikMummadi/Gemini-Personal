import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthenticatedRequest } from './server/auth';
import { executeChatTurn, analyzeJournalEntries } from './server/gemini';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Strict body parsing limits to prevent DoS / oversized payloads
  app.use(express.json({ limit: '512kb' }));

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Sanitized logging helper to prevent leaking API keys, secrets, or journal contents to logs
  const safeLog = (prefix: string, err: any) => {
    const status = err?.status || err?.statusCode || 500;
    const rawMessage = typeof err?.message === 'string' ? err.message : String(err || '');
    // Scrub potential Google API keys or token-like parameters
    const sanitizedMsg = rawMessage
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/key=[^&\s]+/g, 'key=[REDACTED]');
    console.error(`${prefix} [status=${status}]: ${sanitizedMsg}`);
  };

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Gemini Journal API',
      timestamp: new Date().toISOString(),
    });
  });

  // Public Firebase Client configuration endpoint
  // Safe public configuration needed by Firebase Web SDK in browser
  app.get('/api/firebase-config', (req, res) => {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return res.json({
          projectId: config.projectId,
          appId: config.appId,
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          firestoreDatabaseId: config.firestoreDatabaseId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
        });
      }
      return res.status(500).json({ error: 'Firebase configuration not found' });
    } catch (err: any) {
      console.error('[Config] Error serving Firebase config:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve Firebase configuration' });
    }
  });

  // Simple in-memory rate limiting per user UID (max 40 requests per minute)
  const userRateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const checkRateLimit = (uid: string): boolean => {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = 40;

    const record = userRateLimitMap.get(uid);
    if (!record || now > record.resetTime) {
      userRateLimitMap.set(uid, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count++;
    return true;
  };

  // Secure Chat Endpoint — Turn Thoughts Into Action
  app.post('/api/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized user identity' });
    }

    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    const { message, history, isFirstMessage } = req.body;

    // Strict input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content must be a non-empty string.' });
    }

    if (message.length > 8000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 8000 characters.' });
    }

    // Validate history array
    let validatedHistory: Array<{ role: 'user' | 'model'; content: string }> = [];
    if (Array.isArray(history)) {
      if (history.length > 60) {
        return res.status(400).json({ error: 'Conversation history exceeds maximum turn limit.' });
      }

      for (const item of history) {
        if (
          item &&
          (item.role === 'user' || item.role === 'model') &&
          typeof item.content === 'string' &&
          item.content.length <= 10000
        ) {
          validatedHistory.push({
            role: item.role,
            content: item.content,
          });
        }
      }
    }

    try {
      const result = await executeChatTurn(message.trim(), validatedHistory, Boolean(isFirstMessage));
      return res.json(result);
    } catch (err: any) {
      safeLog('[API /api/chat] Error generating Gemini response', err);
      const status = err?.status || 500;
      const errorMessage =
        status === 503
          ? 'The AI model is experiencing high demand. Please retry in a moment.'
          : status === 429
          ? 'Rate limit exceeded. Please wait a moment before sending another message.'
          : 'Unable to process your thought right now. Please try again in a moment.';
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: errorMessage,
      });
    }
  });

  // Secure Insights Synthesis Endpoint
  app.post('/api/insights/analyze', requireAuth, async (req: AuthenticatedRequest, res) => {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized user identity' });
    }

    if (!checkRateLimit(uid)) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries must be a non-empty list of journal records.' });
    }

    if (entries.length > 50) {
      return res.status(400).json({ error: 'Exceeded maximum of 50 entries for insights synthesis.' });
    }

    // Cap at 30 entries and enforce individual and aggregate size bounds
    let totalLength = 0;
    const sanitizedEntries = entries.slice(0, 30).map((e: any) => {
      const title = String(e.title || 'Untitled Thought').slice(0, 150);
      const date = String(e.date || new Date().toISOString()).slice(0, 50);
      const content = String(e.content || '').slice(0, 1500);
      totalLength += title.length + content.length;
      return { title, date, content };
    });

    if (totalLength > 30000) {
      return res.status(400).json({ error: 'Combined journal content exceeds maximum analytical limit.' });
    }

    try {
      const insights = await analyzeJournalEntries(sanitizedEntries);
      return res.json(insights);
    } catch (err: any) {
      safeLog('[API /api/insights/analyze] Error analyzing journal entries', err);
      const status = err?.status || 500;
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: 'Unable to generate life insights at this moment. Please try again.',
      });
    }
  });

  // Global Express error handler to prevent internal leakages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    safeLog('[Server Error]', err);
    res.status(500).json({ error: 'An unexpected internal error occurred.' });
  });

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gemini Journal] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Startup Error]', err);
  process.exit(1);
});
