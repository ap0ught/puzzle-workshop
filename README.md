# The Puzzle Workshop — GitHub Pages edition

A cooperative workshop and zombie-defense prototype. Solve rooms to activate defense systems, earn fighter packages, complete click-and-swap fighter pictures, and defend the perimeter.

## Deploy the included build

No build is required for the first deployment: `docs/` contains the ready-to-host game.

1. Create a GitHub repository and copy the **contents** of this folder into its root, including `.github/workflows/pages.yml`.
2. Commit and push to the `main` branch.
3. In the repository, open **Settings → Pages → Build and deployment → Source**, and choose **GitHub Actions**.
4. Open **Actions → Deploy Puzzle Workshop to GitHub Pages**. Run the workflow manually if the initial push happened before Pages was configured.
5. When the deployment succeeds, open the URL shown by the workflow or in Settings → Pages.

The workflow publishes `docs/` directly. The build uses relative asset URLs, so it works with either `username.github.io` or `username.github.io/repository-name/`.

Alternative: remove `.github/workflows/pages.yml` and choose **Deploy from a branch**, `main`, `/docs` in Pages settings.

## Run locally

To run the included build without Node:

```bash
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000/. Serve it over HTTP; do not open `index.html` directly as a file.

To edit the source, install Node 22.12 or newer, then:

```bash
npm install
npm run dev
```

Before publishing source changes:

```bash
npm run check
npm test
npm run build
```

Commit both the source changes and the rebuilt `docs/` directory. The deployment workflow intentionally uses that prebuilt directory and does not install dependencies in CI.

## What this edition supports

- All eight workshop puzzles, room progression, announcements, and shared trays.
- Three initially open rooms; completed rooms close and lock.
- Used puzzle pieces move into the main-room box. Unused tray pieces return to the floor.
- Load tray from pockets and the temporary TEST shortcut to load matching room pieces.
- Fighter packages progress through 3×3, 4×4, 5×5, 6×6, 7×7, and 8×8 picture grids.
- Picture recruitment uses **click-and-swap**, with every cell filled. Select one piece, then select any other piece.
- Recruited fighters and activated systems power turn-based defense against zombie waves.
- Local browser persistence, Add local player, and Switch player.

## Local play and remote co-op

GitHub Pages hosts static files. By default this edition uses `localStorage` instead of the hosted game's server/database service, so **room codes only connect tabs of the same browser profile at the same site origin** — two players can share one browser using **Add local player / Switch player**, or join the same room from separate tabs, with Web Locks serializing room updates when available. Saved games belong to that browser/site origin; clearing browser storage removes them. Rooms saved in the original hosted game are not automatically transferred.

For co-op across devices, the repository includes an optional room backend in `worker/`: a Cloudflare Worker where each room is one Durable Object and updates are pushed to connected players over a WebSocket. Deploy it, then build the site against it:

```bash
npm run worker:deploy
VITE_ROOM_API=https://<your-worker-url> npm run build
```

With that build, entering a room code on any device joins the same room. The default build (no `VITE_ROOM_API`) stays fully offline and contacts no server. The Worker accepts requests only from the origins listed in `worker/wrangler.toml`, and `npm run worker:dev` runs it locally for development.

## Layout

- `docs/`: ready-built site deployed by GitHub Pages.
- `src/app/`: game UI and styles.
- `src/components/game/`: gear graphics, circuit graphics, fighter portraits, and recruitment UI.
- `src/lib/`: shared puzzle, inventory, progression, recruitment, and combat rules.
- `src/local-room.ts`: browser-local room service, the default when no remote backend is configured.
- `src/room-service.ts`: picks the local room or the room Worker at build time via `VITE_ROOM_API`.
- `worker/`: optional Cloudflare Worker backend for cross-device rooms (one Durable Object per room, WebSocket state push).
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
