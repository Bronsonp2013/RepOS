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

/** Options accepted by `createServer`. */
export interface CreateServerOptions {
  /**
   * What `/api/today` treats as "now". Defaults to the wall clock. Tests
   * inject a fixed instant here instead of a module-global override, so it
   * can never be armed outside a test process (F21).
   */
  now?: () => Date;
}

export function createServer(factory: SourcePoolFactory, options: CreateServerOptions = {}): Express {
  const app = express();
  const now = options.now ?? (() => new Date());

  app.use(helmet());
  app.use(cors({ origin: resolveWebOrigin(), methods: ['GET'] }));

  app.use('/api/sources', sourcesRouter(factory));
  app.use('/api/health', healthRouter(factory));
  app.use('/api/today', todayRouter(factory, now));

  app.use((_req, res) => {
    const body: ApiError = { error: 'not_found' };
    res.status(404).json(body);
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // F32: only the server log gets the (redacted) detail; an unauthenticated
    // caller gets a generic body in production, since redaction strips only
    // URL-shaped credentials and a hostname, database or relation name could
    // still reach the response otherwise.
    const detail = errorMessage(err);
    console.error('[repos-api] request failed:', detail);
    const body: ApiError = {
      error: 'internal_error',
      ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
    };
    res.status(500).json(body);
  });

  return app;
}
