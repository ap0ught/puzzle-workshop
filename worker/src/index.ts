import { Room, validCode } from './room';
import type { Env } from './env';

// Re-exported so wrangler can find the class named in wrangler.toml.
export { Room };

/** Ambiguous glyphs (I, O, 0, 1) are left out so codes survive being read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** An action is a handful of short fields; anything larger is not a game move. */
const MAX_BODY = 8 * 1024;
const CREATE_ATTEMPTS = 6;

function randomCode(): string {
  // 32 glyphs and 256 % 32 === 0, so this is uniform rather than biased.
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originAllowed(origin: string | null, env: Env): boolean {
  const allowed = allowedOrigins(env);
  return allowed.includes('*') || (!!origin && allowed.includes(origin));
}

/**
 * The room token travels in the body or query string and the API sets no
 * cookies, so CORS is a guard rail against a drive-by page silently driving
 * somebody's room rather than the thing that keeps a room private.
 */
function cors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get('Origin');
  if (!originAllowed(origin, env)) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, headers });
}

function roomNameFrom(url: URL): string {
  const segment = url.pathname.split('/').filter(Boolean).pop() || '';
  return segment || (url.searchParams.get('code') || '').toUpperCase();
}

/**
 * Forward to the Durable Object that owns this code, moving the code into the
 * path so the object can read it without trusting anything else on the URL.
 */
function toRoom(request: Request, code: string): Request {
  const target = new URL(request.url);
  target.pathname = `/api/room/${code}`;
  target.searchParams.delete('code');
  return new Request(target, request);
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return cors(request, env, new Response(null, { status: 204 }));
    }
    if (!originAllowed(request.headers.get('Origin'), env)) {
      return cors(request, env, Response.json({ error: 'Origin not allowed.' }, { status: 403 }));
    }

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return cors(request, env, Response.json({ ok: true, service: 'puzzle-workshop-rooms' }));
    }
    if (!url.pathname.startsWith('/api/room')) {
      return cors(request, env, Response.json({ error: 'Not found.' }, { status: 404 }));
    }

    // A bad code never reaches a Durable Object, so scanning random codes
    // cannot spin up an object (and a SQLite table) per guess.
    if (url.pathname !== '/api/room' && !validCode(roomNameFrom(url).toUpperCase())) {
      return cors(request, env, Response.json({ error: 'Room not found.' }, { status: 400 }));
    }

    if (request.method === 'POST' && url.pathname === '/api/room') {
      const length = Number(request.headers.get('Content-Length') || 0);
      if (length > MAX_BODY) {
        return cors(request, env, Response.json({ error: 'Request too large.' }, { status: 413 }));
      }
      let body: any;
      try {
        body = await request.json();
      } catch {
        return cors(request, env, Response.json({ error: 'Malformed request.' }, { status: 400 }));
      }

      if (body?.type !== 'create') {
        const code = String(body?.code || '').toUpperCase();
        if (!validCode(code)) {
          return cors(request, env, Response.json({ error: 'Room not found.' }, { status: 400 }));
        }
        return cors(request, env, await env.ROOM.get(env.ROOM.idFromName(code)).fetch(toRoom(request, code)));
      }

      // Code generation races are resolved by asking the object whether the
      // room it was handed already exists, then drawing again.
      for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
        const code = randomCode();
        const response = await env.ROOM.get(env.ROOM.idFromName(code)).fetch(toRoom(request, code));
        if (response.status !== 409) return cors(request, env, response);
      }
      return cors(request, env, Response.json({ error: 'Could not allocate a room code. Try again.' }, { status: 503 }));
    }

    const code = roomNameFrom(url).toUpperCase();
    return cors(request, env, await env.ROOM.get(env.ROOM.idFromName(code)).fetch(toRoom(request, code)));
  },
} satisfies ExportedHandler<Env, Room>;