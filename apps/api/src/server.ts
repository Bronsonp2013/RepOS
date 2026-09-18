/**
 * The route table. Shared file: no implementation lane owns it, so lanes can
 * add handlers under routes/ without colliding here.
 *
 *   GET /api/sources  → routes/sources.ts  → services/health.ts
 *   GET /api/health   → routes/health.ts   → services/health.ts
 *   GET /api/today    → routes/today.ts    → services/today.ts → blocks/*
 *
 * RepOS binds to a private network only (docs/REPOS_V1.md §2.6); there is no
 * auth in V1, which is why helmet and a narrow CORS origin (REPOS_WEB_ORIGIN)
 * are on by default, and boot refuses to start in production without one.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ApiError } from '@repos/shared';
import type { SourcePoolFactory } from '@repos/sources';
import { sourcesRouter } from './routes/sources';
import { healthRouter } from './routes/health';
import { todayRouter } from './routes/today';
import { errorMessage } from './services/redact';

// The browser origin allowed to call this API. In production it must come
// from the environment (no writable/no-auth surface should ever be openly
// readable); in dev/test it defaults to the web dev/preview origin the e2e
// suite serves (REPOS_WEB_PORT, .env.example).
function resolveWebOrigin(): string | false {
  const configured = process.env.REPOS_WEB_ORIGIN;
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'REPOS_WEB_ORIGIN must be set in production (refusing to boot with an open CORS origin)'
    );
  }
  const webPort = process.env.REPOS_WEB_PORT ?? '5173';
  return `http://127.0.0.1:${webPort}`;
}

export function createServer(factory: SourcePoolFactory): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: resolveWebOrigin(), methods: ['GET'] }));

  app.use('/api/sources', sourcesRouter(factory));
  app.use('/api/health', healthRouter(factory));
  app.use('/api/today', todayRouter(factory));

  app.use((_req, res) => {
    const body: ApiError = { error: 'not_found' };
    res.status(404).json(body);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const body: ApiError = {
      error: 'internal_error',
      detail: errorMessage(err),
    };
    res.status(500).json(body);
  });

  return app;
}
