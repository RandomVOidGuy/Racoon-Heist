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
- `js/level.js` — museum courtyard: lighting, walls, crates, security cameras, BroomBot, sardine, dumpster
- `js/raccoon.js` — the player character (placeholder primitives for now)
- `js/controls.js` — keyboard + touch joystick input
- `vendor/three.module.min.js` — Three.js r168, vendored
- `textures/` — texture assets (empty for now)

## Gameplay

Sneak across the courtyard and steal the Golden Sardine off its pedestal. Security cameras sweep the grounds — their vision cones show on the floor, and they turn red when they spot you. Duck behind crates to break line of sight, and stay clear of the patrolling BroomBot: it catches on contact. Once you grab the sardine the alarm goes up (faster cameras, faster bot) — dash to the glowing getaway dumpster in the southeast corner to win.

## Status

Playable: full sneak → steal → escape loop with win/lose screens. Next up: sound, generated textures, and more level variety.
