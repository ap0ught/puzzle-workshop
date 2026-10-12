import type { Room } from './room';

/** Bindings and vars available to the room Worker. See worker/wrangler.toml. */
export interface Env {
  /** One Durable Object namespace; each room code maps to one instance. */
  ROOM: DurableObjectNamespace<Room>;
  /**
   * Comma-separated list of browser origins allowed to call the room API,
   * or "*" for any origin. The player token travels in the request body and
   * no cookies are used, so the allowlist is defence in depth rather than the
   * only thing standing between a room and a stranger.
   */
  ALLOWED_ORIGINS?: string;
}