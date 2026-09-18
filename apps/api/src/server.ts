/**
 * The route table. Shared file: no implementation lane owns it, so lanes can
 * add handlers under routes/ without colliding here.
 *
 *   GET /api/sources  → routes/sources.ts  → services/health.ts
 *   GET /api/health   → routes/health.ts   → services/health.ts
 *   GET /api/today    → routes/today.ts    → services/today.ts → blocks/*
 *
 * RepOS binds to a private network only (docs/REPOS_V1.md §2.6); there is no
 * auth in V1, which is why helmet and a narrow CORS origin are on by default.
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ApiError } from '@repos/shared';
import type { SourcePoolFactory } from '@repos/sources';
import { sourcesRouter } from './routes/sources';
import { healthRouter } from './routes/health';
import { todayRouter } from './routes/today';

export function createServer(factory: SourcePoolFactory): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());

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
      detail: err instanceof Error ? err.message : String(err),
    };
    res.status(500).json(body);
  });

  return app;
}
