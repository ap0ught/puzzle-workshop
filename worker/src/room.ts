import { DurableObject } from 'cloudflare:workers';
import { initial, act, check } from '../../src/lib/game.ts';
import type { Env } from './env';

/** Room codes are the Durable Object name, so keep them a fixed, boring shape. */
const CODE = /^[A-Z0-9]{8}$/;

/** Matches the client: eight uppercase alphanumerics. */
export function validCode(code: unknown): code is string {
  return typeof code === 'string' && CODE.test(code);
}

export const MAX_PLAYERS = 2;

/** Player tokens are secrets. Never let them leave the room. */
export function view(state: any) {
  return { ...state, players: state.players.map(({ token, ...player }: any) => player) };
}

export class RoomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RoomError';
    this.status = status;
  }
}

const json = (value: unknown, status = 200) => Response.json(value, { status });

export class Room extends DurableObject<Env> {
  #state: any = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Opening the database is the one thing that must not interleave, so it
    // happens before this instance can serve any request.
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, state TEXT NOT NULL)');
      const row = ctx.storage.sql.exec<{ state: string }>('SELECT state FROM room WHERE id = 1').toArray()[0];
      if (row) this.#state = JSON.parse(row.state);
    });
  }

  #require(): any {
    if (!this.#state) throw new RoomError('Room not found.', 404);
    return this.#state;
  }

  async #persist(): Promise<void> {
    await this.ctx.storage.sql.exec('UPDATE room SET state = ?1 WHERE id = 1', JSON.stringify(this.#state));
  }

  /**
   * Every mutation ends here: recompute derived flags, bump version, persist,
   * push. Callers pass the state as it was before their mutation, because by
   * the time this runs the state already carries the new move.
   */
  async #commit(before: string): Promise<void> {
    check(this.#state);
    if (JSON.stringify(this.#state) !== before) this.#state.version++;
    await this.#persist();
    this.#broadcast();
  }

  /** Hibernation API, so idle sockets cost nothing between turns. */
  #broadcast(): void {
    if (!this.#state) return;
    const payload = JSON.stringify({ type: 'state', state: view(this.#state) });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // A socket can die between getWebSockets() and send(); the next
        // commit reaches whoever is left.
      }
    }
  }

  #playerCount(): number {
    return this.#state ? this.#state.players.length : 0;
  }

  /** A code is only free if its Durable Object has never held a room. */
  async exists(): Promise<boolean> {
    return this.#state !== null;
  }

  async create(name: string) {
    if (this.#state) throw new RoomError('Room already exists.', 409);
    const before = JSON.stringify(this.#state);
    const state = initial();
    state.players.push({ id: 1, name: name.slice(0, 20), token: crypto.randomUUID(), x: 45, y: 60 });
    this.#state = state;
    await this.#commit(before);
    return { code: this.ctx.id.name || '', token: state.players[0].token, player: 1, state: view(state) };
  }

  async join(name: string) {
    const state = this.#require();
    if (state.players.length >= MAX_PLAYERS) {
      throw new RoomError('This room already has two players.', 409);
    }
    const token = crypto.randomUUID();
    const before = JSON.stringify(state);
    state.players.push({ id: state.players.length + 1, name: name.slice(0, 20), token, x: 55, y: 60 });
    await this.#commit(before);
    return { state: view(state), token, player: state.players.length };
  }

  /**
   * act() is the same module the browser uses, so the server and the client
   * cannot drift apart on what a legal move is. act() itself rejects a token
   * that is not one of the room's players.
   */
  async move(token: string, action: any) {
    const state = this.#require();
    const before = JSON.stringify(state);
    act(state, token, action);
    await this.#commit(before);
    return { state: view(state) };
  }

  /** Read-only, but a legacy room may predate a rule, so check() can still change it. */
  async read() {
    const state = this.#require();
    const before = JSON.stringify(state);
    check(state);
    if (JSON.stringify(state) !== before) {
      state.version++;
      await this.#persist();
    }
    return { state: view(state) };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // The Worker moves the code into the path before forwarding, so that is
    // the only place it is trusted to be (never a query param the client set).
    const code = (url.pathname.split('/').filter(Boolean).pop() || '').toUpperCase();

    if (request.headers.get('Upgrade') === 'websocket') {
      if (!validCode(code)) return json({ error: 'Room not found.' }, 404);
      const state = this.#require();
      const token = url.searchParams.get('token') || '';
      const player = state.players.find((p: any) => p.token === token);
      if (!player) return json({ error: 'Player session expired. Rejoin the room.' }, 403);
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      // acceptWebSocket() registers the socket for hibernation and accepts it;
      // a plain accept() before it would make the call below throw.
      this.ctx.acceptWebSocket(server);
      // Send current state immediately so a reconnecting player is never
      // waiting for the next turn to find out where the game stands.
      server.send(JSON.stringify({ type: 'state', state: view(state) }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'GET') {
      if (!validCode(code)) return json({ error: 'Room not found.' }, 404);
      try {
        return json(await this.read());
      } catch (error: any) {
        return json({ error: error.message }, error.status || 400);
      }
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Malformed request.' }, 400);
    }

    try {
      switch (body?.type) {
        case 'create':
          return json(await this.create(String(body.name || 'Player 1')));
        case 'join':
          return json(await this.join(String(body.name || 'Player 2')));
        default:
          return json(await this.move(String(body?.token || ''), body));
      }
    } catch (error: any) {
      return json({ error: error?.message || 'Could not update the room.' }, error?.status || 400);
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // The client only ever listens; the sole exception is a keepalive ping so
    // intermediaries do not silently drop an idle tab.
    if (message === 'ping') {
      try {
        ws.send(JSON.stringify({ type: 'pong' }));
      } catch {
        // Same race as #broadcast().
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Nothing to do: players keep their seat across a disconnect so a player
    // can close the laptop and resume the same room later.
  }
}