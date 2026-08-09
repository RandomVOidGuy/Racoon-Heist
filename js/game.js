import * as THREE from 'three';
import { Controls } from './controls.js';
import { buildLevel } from './level.js';
import { Raccoon } from './raccoon.js';

const RACCOON_SPEED = 6; // units per second
const CAMERA_OFFSET = new THREE.Vector3(0, 9, 11);
const ALERT_FILL_TIME = 0.8; // seconds in a cone before busted
const ALERT_DECAY_RATE = 1.0; // fraction of the meter drained per second
const GRAB_RANGE = 2.4;
const ESCAPE_RANGE = 2.6;
const BOT_CATCH_RANGE = 1.6;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.state = 'sneak'; // sneak → escape → busted | won
    this.alert = 0;
    this.elapsed = 0;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1026);
    this.scene.fog = new THREE.Fog(0x0b1026, 30, 80);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

    this.level = buildLevel(this.scene);
    this.raccoon = new Raccoon();
    this.raccoon.group.position.set(0, 0, 16);
    this.scene.add(this.raccoon.group);

    this.controls = new Controls();
    this.moveDir = new THREE.Vector3();

    this.hud = {
      objective: document.getElementById('hud-objective'),
      loot: document.getElementById('hud-loot'),
      alertFill: document.getElementById('alert-fill'),
      vignette: document.getElementById('vignette'),
      endScreen: document.getElementById('end-screen'),
      endEmoji: document.getElementById('end-emoji'),
      endTitle: document.getElementById('end-title'),
      endText: document.getElementById('end-text'),
    };
    document.getElementById('restart-button').addEventListener('click', () => location.reload());

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Slow moonlit pan behind the title screen before the game starts.
  renderTitleBackdrop() {
    const animate = () => {
      if (this.running) return;
      const t = performance.now() / 1000;
      this.camera.position.set(Math.sin(t * 0.1) * 18, 8, Math.cos(t * 0.1) * 18);
      this.camera.lookAt(0, 1, 0);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(animate);
    };
    animate();
  }

  start() {
    this.running = true;
    this.controls.attach();
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const playing = this.state === 'sneak' || this.state === 'escape';

    if (playing) {
      this.elapsed += dt;

      const input = this.controls.direction; // {x, z} in [-1, 1]
      this.moveDir.set(input.x, 0, input.z);
      if (this.moveDir.lengthSq() > 1) this.moveDir.normalize();

      this.raccoon.move(this.moveDir, RACCOON_SPEED * dt, this.level.bounds);
      this.collideWithProps();
      this.raccoon.update(dt);

      this.updateObjectives();
      this.updateDetection(dt);
    }

    const target = this.raccoon.group.position;
    this.camera.position.lerp(
      new THREE.Vector3().addVectors(target, CAMERA_OFFSET),
      1 - Math.pow(0.001, dt)
    );
    this.camera.lookAt(target.x, target.y + 1, target.z);

    this.level.update(dt, this.state === 'escape', this.state !== 'sneak');
    this.renderer.render(this.scene, this.camera);
  }

  // Push the raccoon out of crates, the pedestal and the dumpster.
  collideWithProps() {
    const pos = this.raccoon.group.position;
    for (const c of this.level.colliders) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const dist = Math.hypot(dx, dz);
      const minDist = c.r + 0.55;
      if (dist > 0.0001 && dist < minDist) {
        pos.x = c.x + (dx / dist) * minDist;
        pos.z = c.z + (dz / dist) * minDist;
      }
    }
  }

  updateObjectives() {
    const pos = this.raccoon.group.position;

    if (this.state === 'sneak') {
      const d = Math.hypot(pos.x - this.level.pedestalPos.x, pos.z - this.level.pedestalPos.z);
      if (d < GRAB_RANGE) this.grabSardine();
    } else if (this.state === 'escape') {
      const d = Math.hypot(pos.x - this.level.dumpsterPos.x, pos.z - this.level.dumpsterPos.z);
      if (d < ESCAPE_RANGE) this.win();
    }
  }

  grabSardine() {
    this.state = 'escape';

    // The sardine rides on the raccoon's back from here on
    const { sardine, sardineGlow } = this.level;
    this.scene.remove(sardine);
    this.raccoon.group.add(sardine);
    sardine.position.set(0, 1.45, -0.2);
    sardine.rotation.set(0, Math.PI / 2, 0.15);
    this.scene.remove(sardineGlow);

    this.hud.objective.textContent = 'ALARM! Escape to the getaway dumpster!';
    this.hud.loot.textContent = '🐟 1';
  }

  updateDetection(dt) {
    const rPos = this.raccoon.group.position;
    let seen = false;

    for (const cam of this.level.cameras) {
      let spotting = false;
      const dx = rPos.x - cam.group.position.x;
      const dz = rPos.z - cam.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < cam.range) {
        const toAngle = Math.atan2(dx, dz);
        let dAng = toAngle - cam.pivot.rotation.y;
        while (dAng > Math.PI) dAng -= Math.PI * 2;
        while (dAng < -Math.PI) dAng += Math.PI * 2;
        if (Math.abs(dAng) < cam.halfAngle) {
          spotting = !this.losBlocked(cam, rPos);
        }
      }
      cam.setSpotting(spotting);
      seen = seen || spotting;
    }

    // BroomBot catches on contact
    const botDist = this.level.bot.position.distanceTo(rPos);
    if (botDist < BOT_CATCH_RANGE) {
      this.bust('The BroomBot swept you up!');
      return;
    }

    this.alert = THREE.MathUtils.clamp(
      this.alert + (seen ? dt / ALERT_FILL_TIME : -dt * ALERT_DECAY_RATE),
      0,
      1
    );
    this.hud.alertFill.style.width = `${this.alert * 100}%`;
    this.hud.vignette.style.opacity = this.alert * 0.9;

    if (this.alert >= 1) {
      this.bust('A security camera caught you red-pawed.');
    }
  }

  // True when a crate sits between the camera head and the raccoon.
  losBlocked(cam, rPos) {
    const headPos = new THREE.Vector3();
    cam.head.getWorldPosition(headPos);
    const target = new THREE.Vector3(rPos.x, rPos.y + 0.8, rPos.z);
    const dir = new THREE.Vector3().subVectors(target, headPos);
    const dist = dir.length();
    this.raycaster.set(headPos, dir.normalize());
    this.raycaster.far = dist - 0.5;
    return this.raycaster.intersectObjects(this.level.obstacles, false).length > 0;
  }

  bust(reason) {
    this.state = 'busted';
    this.hud.vignette.style.opacity = 0;
    this.showEnd('🚨', 'BUSTED!', `${reason} The Golden Sardine stays in its case… for now.`);
  }

  win() {
    this.state = 'won';
    this.hud.vignette.style.opacity = 0;
    const secs = this.elapsed.toFixed(1);
    this.showEnd(
      '🦝🐟',
      'CLEAN GETAWAY!',
      `You escaped with the Golden Sardine in ${secs} seconds. The crew eats like royalty tonight.`
    );
  }

  showEnd(emoji, title, text) {
    this.hud.endEmoji.textContent = emoji;
    this.hud.endTitle.textContent = title;
    this.hud.endText.textContent = text;
    this.hud.endScreen.classList.add('show');
  }
}
