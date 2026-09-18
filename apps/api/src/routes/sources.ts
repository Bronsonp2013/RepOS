/** Router for `GET /api/sources`.  */
import { Router } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { buildSourceSummaries } from '../services/health';

export function sourcesRouter(factory: SourcePoolFactory): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await buildSourceSummaries(factory));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
