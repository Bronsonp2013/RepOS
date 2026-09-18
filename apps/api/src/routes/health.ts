/** Router for `GET /api/health`.  */
import { Router } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { buildHealthReport } from '../services/health';

export function healthRouter(factory: SourcePoolFactory): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await buildHealthReport(factory));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
