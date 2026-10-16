# The Puzzle Workshop — GitHub Pages edition

A cooperative workshop and zombie-defense prototype. Solve rooms to activate defense systems, earn fighter packages, complete click-and-swap fighter pictures, and defend the perimeter.

## Deploy

Push to `main`. The `.github/workflows/pages.yml` workflow runs the checks and tests, then publishes the committed `docs/` to GitHub Pages — no build happens in CI. The build uses relative asset URLs, so it works with either `username.github.io` or `username.github.io/repository-name/`.

The committed `docs/` is the cross-device edition pointed at the Worker deployed for this repository (see [Remote co-op](#remote-co-op-the-included-build)). If you fork or copy this package to a different repository or Worker, rebuild `docs/` against your own Worker URL and update `ALLOWED_ORIGINS` in `worker/wrangler.toml` to include your Pages origin, or the browser will be blocked.

## Run locally

To run the included build without Node:

```bash
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000/. Serve it over HTTP; do not open `index.html` directly as a file. (The committed `docs/` contacts the deployed room Worker; if the Worker is unreachable the game still loads and shows connection errors instead.)

To edit the source, install Node 22.12 or newer, then:

```bash
npm install
npm run dev
```

`npm run dev` builds the offline edition for local development against `localhost:5173`. Before publishing source changes, rebuild the committed (remote) edition and verify it:

```bash
npm run check
npm test
VITE_ROOM_API=https://puzzle-workshop-rooms.puzzle-workshop-github-pages.workers.dev npm run build
```

To verify the whole experience in a real browser — both editions, including
two separate browser profiles playing one room through the local room Worker —
run the end-to-end script:

```bash
npx playwright install chromium
node scripts/e2e.mjs
```

It builds each edition, serves it from port 5173 (the origin allowed by
`worker/wrangler.toml`), and checks lobby, create/join, partner visibility,
and that a move reaches the other profile over the WebSocket rather than the
poll.

Commit both the source changes and the rebuilt `docs/` directory. The deployment workflow intentionally uses that prebuilt directory and does not install dependencies in CI.

## What this edition supports

- All eight workshop puzzles, room progression, announcements, and shared trays.
- Three initially open rooms; completed rooms close and lock.
- Choose an ordered lineup of 1–16 rooms in the lobby, including repeated puzzle types. The default is the original eight rooms. The first three (or all rooms in a shorter run) start open; each completion unlocks the next selected room.
- The creator’s lineup is saved with the whole room and shared by both players. Each instance has its own pieces and puzzle progress, and awards a distinct fighter package and defense-system bonus, including duplicates.
- Used puzzle pieces move into the main-room box. Unused tray pieces return to the floor.
- Load tray from pockets and the temporary TEST shortcut to load matching room pieces.
- Fighter packages progress through 3×3, 4×4, 5×5, 6×6, 7×7, and 8×8 picture grids.
- Picture recruitment uses **click-and-swap**, with every cell filled. Select one piece, then select any other piece.
- Recruited fighters and activated systems power turn-based defense against zombie waves.
- Cross-device co-op through the room Worker (two players, any devices), plus local browser persistence, Add local player, and Switch player.

## Remote co-op (the included build)

The committed `docs/` build is the **cross-device edition**: it talks to a room backend deployed at `https://puzzle-workshop-rooms.puzzle-workshop-github-pages.workers.dev`. The backend is the Cloudflare Worker in `worker/` — one Durable Object per room, with updates pushed to connected players over a WebSocket — so entering a room code on any device joins the same room. The Worker accepts requests only from the origins listed in `worker/wrangler.toml`.

The site learns the Worker's URL from `VITE_ROOM_API` at build time. To rebuild the committed (remote) edition:

```bash
VITE_ROOM_API=https://puzzle-workshop-rooms.puzzle-workshop-github-pages.workers.dev npm run build
```

To deploy (or re-deploy) the Worker itself:

```bash
npm run worker:deploy
```

`npm run worker:dev` runs the Worker locally (port 8799) for development, and `scripts/e2e.mjs` exercises both a local Worker and the offline fallback in a real browser.

### Offline fallback

Building without `VITE_ROOM_API` produces a fully offline edition that contacts no server. It uses `localStorage` instead of the room backend, so **room codes only connect tabs of the same browser profile at the same site origin** — two players can share one browser using **Add local player / Switch player**, or join the same room from separate tabs, with Web Locks serializing room updates when available. Saved games belong to that browser/site origin; clearing browser storage removes them.

```bash
npm run build
```

## Layout

- `docs/`: ready-built site deployed by GitHub Pages.
- `src/app/`: game UI and styles.
- `src/components/game/`: gear graphics, circuit graphics, fighter portraits, and recruitment UI.
- `src/lib/`: shared puzzle, inventory, progression, recruitment, and combat rules.
- `src/local-room.ts`: browser-local room service, used by the offline fallback build.
- `src/room-service.ts`: picks the local room or the room Worker at build time via `VITE_ROOM_API`.
- `worker/`: Cloudflare Worker backend for cross-device rooms (one Durable Object per room, WebSocket state push).
- `tests/`: puzzle, recruitment, inventory, circuit, combat, and local-room checks; run with `npm test`.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.

## Acknowledgements and inspiration

Thank you to the maintainers of these projects, which Christopher shared as references while developing the original demo:

| Project | What it inspired |
| --- | --- |
| [nkanigsberg/waterworks](https://github.com/nkanigsberg/waterworks) | Rotatable pipes, an explicit water test, visible flow, and leak feedback for Waterworks. |
| [mahahahad/SlidingPuzzle](https://github.com/mahahahad/SlidingPuzzle) | The numbered slider's solvable shuffle, gap/movable-tile cues, and move feedback. |
| [kflorence/beaming](https://github.com/kflorence/beaming) | Light-path tracing, reflective angles, and emitter-to-receiver connection goals for Beam Routing. Our adaptation uses a square grid. |
| [daattali/lightsout](https://github.com/daattali/lightsout) | Guaranteed-solvable patterns, standard adjacent-light toggles, clear on/off states, and solution hints. |
| [shankarmadeshvaran/Puzzle](https://github.com/shankarmadeshvaran/Puzzle) | Reconstructing a picture by swapping image pieces, adapted into full-grid click-and-swap fighter recruitment. |
| [circuitsim/circuit-simulator](https://github.com/circuitsim/circuit-simulator) | Visible electrical components, editable values, and simulated circuit behavior. Our game uses a simplified DC voltage/resistance/current challenge, not the full upstream simulator. |

These projects are acknowledged as design and mechanics references. Their applications and image/audio assets are not bundled in this download; the game-specific implementations and fighter artwork here were created for this prototype. Please visit the original projects for their complete functionality, authorship, and licenses.

Runtime/build dependencies include React, React DOM, Vite, TypeScript, and the Vite React plugin. Runtime license notices are in `THIRD-PARTY-NOTICES.txt`.

## Deployment references

- [GitHub: using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Verification for this package

The source passes TypeScript checking, the static production build, and local-room behavior checks for creation, joining, persistence, token masking, conflicting pickups, tray loading, and the two-player limit. Browser visual QA was not available during packaging.
