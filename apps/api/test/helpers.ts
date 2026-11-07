import request from 'supertest';
import { CSRF_COOKIE, CSRF_HEADER } from '@trustlisto/shared';
import { createApp } from '../src/app';

export const app = createApp();
export const PASSWORD = 'Password123!';

/** Signs in and returns an agent that keeps cookies, plus the CSRF token for writes. */
export async function signIn(email: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${res.text}`);
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const csrf = cookies
    .find((c) => c.startsWith(`${CSRF_COOKIE}=`))
    ?.split(';')[0]
    ?.split('=')[1];
  return { agent, csrf: csrf!, csrfHeader: { [CSRF_HEADER]: csrf! } };
}
