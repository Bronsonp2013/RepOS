/** Router for `GET /api/today`. */
import { Router } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { buildToday } from '../services/today';

export function todayRouter(factory: SourcePoolFactory, now: () => Date): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await buildToday(factory, now()));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
