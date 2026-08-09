# Racoon Heist

A tiny browser-based game project, inspired by [Simon Willison's Raccoon Heist](https://simonwillison.net/2026/Aug/5/raccoon-heist/).

## Playing

Deployed via GitHub Pages (see `.github/workflows/pages.yml`). Locally, serve the repo root with any static file server and open `index.html`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Controls: WASD / arrow keys on desktop, drag joystick on touch devices.

## Structure

- `index.html` — title screen, HUD, and entry point (no build step; ES modules + import map)
- `js/main.js` — boot: wires title screen to the game
- `js/game.js` — renderer, camera, game loop
- `js/level.js` — museum courtyard scene: lighting, walls, the Golden Sardine
- `js/raccoon.js` — the player character (placeholder primitives for now)
- `js/controls.js` — keyboard + touch joystick input
- `vendor/three.module.min.js` — Three.js r168, vendored
- `textures/` — texture assets (empty for now)

## Status

Scaffold stage: title screen and a moonlit courtyard you can scurry around in. Gameplay (guards, cameras, actually stealing the sardine) comes next.
