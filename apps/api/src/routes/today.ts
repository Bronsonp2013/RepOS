/** Router for `GET /api/today`. */
import { Router } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { buildToday, resolveNow } from '../services/today';

export function todayRouter(factory: SourcePoolFactory): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await buildToday(factory, resolveNow()));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
