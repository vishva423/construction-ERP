import { NextRequest, NextResponse } from 'next/server';

type AccessPayload = {
  exp?: unknown;
  role?: unknown;
  type?: unknown;
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function isValidAdminToken(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const header: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    const payload: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    if (typeof header !== 'object' || header === null || (header as Record<string, unknown>).alg !== 'HS256') {
      return false;
    }
    if (typeof payload !== 'object' || payload === null) return false;

    const claims = payload as AccessPayload;
    if (claims.type !== 'access' || claims.role !== 'SUPER_ADMIN'
      || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' || pathname === '/login' || pathname === '/demo') {
    return NextResponse.next();
  }

  const token = request.cookies.get('erp_access')?.value;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (token && secret && await isValidAdminToken(token, secret)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|brand/|images/).*)'],
};
