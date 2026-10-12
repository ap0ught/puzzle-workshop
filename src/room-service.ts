import { requestRoom as localRequest } from './local-room';

/**
 * Where cross-device rooms live. Set VITE_ROOM_API at build time to the room
 * Worker's origin (see worker/wrangler.toml). Left empty, the game falls back
 * to the browser-only room in local-room.ts, where a room code only means
 * something to another tab of the same browser.
 */
export const ROOM_API: string = String((import.meta as any).env?.VITE_ROOM_API || '').replace(/\/+$/, '');

export const remoteRooms = ROOM_API !== '';

/** Same shapes as the local room, so the page cannot tell the two apart. */
const code = (value: string) => value.trim().toUpperCase();

async function remoteRequest(url: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  const isGet = !options?.method || options.method === 'GET';

  if (isGet) {
    const target = code(new URL(url, 'https://local.invalid').searchParams.get('code') || '');
    return fetch(`${ROOM_API}/api/room/${target}`, { headers });
  }

  let body: any;
  try {
    body = JSON.parse(String(options?.body || '{}'));
  } catch {
    return Response.json({ error: 'Malformed request.' }, { status: 400 });
  }
  headers['Content-Type'] = 'application/json';

  // `create` is the only call without a code, and it is the only one that must
  // not carry one: the Worker allocates the code that names the new room.
  if (body?.type === 'create') {
    return fetch(`${ROOM_API}/api/room`, { method: 'POST', headers, body: JSON.stringify(body) });
  }
  return fetch(`${ROOM_API}/api/room/${code(String(body?.code || ''))}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export function requestRoom(url: string, options?: RequestInit): Promise<Response> {
  return remoteRooms ? remoteRequest(url, options) : localRequest(url, options);
}

type Listener = (state: any) => void;

/**
 * Push room state to this tab. A no-op for local rooms, where the page's own
 * poll is the only channel there is.
 *
 * The socket reconnects on its own because a co-op session should survive a
 * tunnel, a phone locking, or a router blinking.
 */
export function subscribeRoom(room: string, token: string, onState: Listener): () => void {
  if (!remoteRooms || !room || !token) return () => {};

  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let delay = 1000;
  let closed = false;

  const connect = () => {
    if (closed) return;
    const target = code(room);
    socket = new WebSocket(`${ROOM_API.replace(/^http/, 'ws')}/api/room/${target}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      delay = 1000;
      // Proxies and mobile NATs drop idle sockets, so answer the Worker's
      // keepalive contract between turns; the reconnect loop heals the rest.
      ping = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) socket.send('ping');
      }, 30000);
    };
    socket.onmessage = (event) => {
      let message: any;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message?.type === 'state' && message.state) onState(message.state);
    };
    socket.onclose = () => {
      if (ping) {
        clearInterval(ping);
        ping = null;
      }
      if (closed) return;
      retry = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 15000);
    };
  };

  connect();
  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    if (ping) clearInterval(ping);
    socket?.close();
  };
}