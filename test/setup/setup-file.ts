/** vitest setupFiles: loads .env.test inside each worker process. */
import { loadTestEnv } from './load-env';

loadTestEnv();
