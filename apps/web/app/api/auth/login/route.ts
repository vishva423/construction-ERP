import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

loadEnvConfig(path.resolve(process.cwd(), '../..'));

type LoginBody = {
  email?: unknown;
  mobile?: unknown;
  password?: unknown;
};

function equalsSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signToken(payload: Record<string, string | number>, secret: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export async function POST(request: Request) {
  const host = request.headers.get('host');
  const hostname = host ? new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, '') : '';
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);

  if (process.env.DEV_LOGIN_ENABLED !== 'true' || !isLocalHost) {
    return NextResponse.json({ message: 'Local demo sign-in is disabled.' }, { status: 404 });
  }

  let body: LoginBody;
  try {
    body = await request.json() as LoginBody;
  } catch {
    return NextResponse.json({ message: 'A valid JSON request body is required.' }, { status: 400 });
  }

  const configuredIdentifier = process.env.DEV_LOGIN_EMAIL?.trim();
  const configuredPassword = process.env.DEV_LOGIN_PASSWORD;
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!configuredIdentifier || !configuredPassword || !accessSecret || !refreshSecret) {
    return NextResponse.json({ message: 'Local demo sign-in is not fully configured.' }, { status: 503 });
  }

  const submittedIdentifier = typeof body.email === 'string'
    ? body.email.trim()
    : typeof body.mobile === 'string'
      ? body.mobile.trim()
      : '';
  const submittedPassword = typeof body.password === 'string' ? body.password : '';

  if (!equalsSecret(submittedIdentifier.toLowerCase(), configuredIdentifier.toLowerCase())
    || !equalsSecret(submittedPassword, configuredPassword)) {
    return NextResponse.json({ message: 'The email/mobile number or password is incorrect.' }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const subject = configuredIdentifier;
  const role = 'SUPER_ADMIN';
  const accessToken = signToken({
    sub: subject,
    role,
    type: 'access',
    iat: now,
    exp: now + 15 * 60,
    jti: randomUUID(),
  }, accessSecret);
  const refreshToken = signToken({
    sub: subject,
    role,
    type: 'refresh',
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
    jti: randomUUID(),
  }, refreshSecret);

  return NextResponse.json({ accessToken, refreshToken, role });
}
