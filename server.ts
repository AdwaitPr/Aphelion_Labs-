import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CalibrationsStore } from './src/server/calibrationsStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const store = new CalibrationsStore();

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', calibrationsCount: store.list().length });
  });

  app.get('/api/calibrations', (_req, res) => {
    const calibrations = store.list();
    res.json({ calibrations });
  });

  app.post('/api/calibrations', (req, res) => {
    const result = store.create(req.body);
    if (!result.ok) {
      res.status(result.status).json({
        error: result.errors[0] ?? 'Invalid optical calibration payload.',
        errors: result.errors,
      });
      return;
    }
    res.status(201).json({
      calibration: result.calibration,
      calibrations: store.list(),
    });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Malformed JSON body.' });
      return;
    }
    next(err);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aphelion Labs Optical Stage server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Aphelion Labs server:', err);
  process.exit(1);
});
