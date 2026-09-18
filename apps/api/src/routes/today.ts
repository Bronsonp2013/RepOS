/** Router for `GET /api/today`. STUB — the `routes` lane implements the handler. */
import { Router } from 'express';
import type { SourcePoolFactory } from '@repos/sources';
import { buildToday } from '../services/today';

export function todayRouter(factory: SourcePoolFactory): Router {
  const router = Router();
  router.get('/', async (_req, res, next) => {
    try {
      res.json(await buildToday(factory, new Date()));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
