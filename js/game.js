import * as THREE from 'three';
import { Controls } from './controls.js';
import { buildLevel } from './level.js';
import { Raccoon } from './raccoon.js';

const RACCOON_SPEED = 6; // units per second
const CAMERA_OFFSET = new THREE.Vector3(0, 9, 11);

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.clock = new THREE.Clock();

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
    this.scene.add(this.raccoon.group);

    this.controls = new Controls();
    this.moveDir = new THREE.Vector3();

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

    const input = this.controls.direction; // {x, z} in [-1, 1]
    this.moveDir.set(input.x, 0, input.z);
    if (this.moveDir.lengthSq() > 1) this.moveDir.normalize();

    this.raccoon.move(this.moveDir, RACCOON_SPEED * dt, this.level.bounds);
    this.raccoon.update(dt);

    const target = this.raccoon.group.position;
    this.camera.position.lerp(
      new THREE.Vector3().addVectors(target, CAMERA_OFFSET),
      1 - Math.pow(0.001, dt)
    );
    this.camera.lookAt(target.x, target.y + 1, target.z);

    this.level.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
