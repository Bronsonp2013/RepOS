/** vitest globalSetup: loads .env.test before any suite runs. */
import { loadTestEnv } from './load-env';

export default function setup(): void {
  loadTestEnv();
}
