import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApiApp } from './server';

const port = Number(process.env.PORT || 3000);

async function startServer() {
  const app = createApiApp();
  // Vite middleware in development, static assets in production.
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: express.Request, res: express.Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sri Parameshmari Printers server running on http://0.0.0.0:${port}`);
  });
}

void startServer();
