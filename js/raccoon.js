import * as THREE from 'three';

// Placeholder raccoon built from primitives — grey body, dark mask and
// striped tail — until real models/textures land in textures/.
export class Raccoon {
  constructor() {
    this.group = new THREE.Group();
    this.heading = 0;
    this.wobble = 0;

    const grey = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.9 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.7, 6, 12), grey);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.65;
    body.castShadow = true;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), grey);
    head.position.set(0, 1.0, 0.75);
    head.castShadow = true;
    this.group.add(head);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.3), dark);
    mask.position.set(0, 1.05, 1.02);
    this.group.add(mask);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 10), cream);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.92, 1.15);
    this.group.add(snout);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 8), dark);
      ear.position.set(side * 0.28, 1.4, 0.65);
      this.group.add(ear);
    }

    // Striped tail
    this.tail = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 - i * 0.02, 10, 8),
        i % 2 === 0 ? grey : dark
      );
      ring.position.z = -0.75 - i * 0.28;
      ring.position.y = 0.65 + i * 0.1;
      ring.castShadow = true;
      this.tail.add(ring);
    }
    this.group.add(this.tail);
  }

  // dir is a normalized-or-zero world-space direction; step is distance.
  move(dir, step, bounds) {
    if (dir.lengthSq() === 0) {
      this.moving = false;
      return;
    }
    this.moving = true;

    const pos = this.group.position;
    pos.x = THREE.MathUtils.clamp(pos.x + dir.x * step, bounds.min, bounds.max);
    pos.z = THREE.MathUtils.clamp(pos.z + dir.z * step, bounds.min, bounds.max);

    // Face direction of travel (model forward is +z)
    const target = Math.atan2(dir.x, dir.z);
    let delta = target - this.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.heading += delta * 0.25;
    this.group.rotation.y = this.heading;
  }

  update(dt) {
    // Scurry wobble while moving, gentle tail sway when idle
    this.wobble += dt * (this.moving ? 14 : 3);
    this.group.position.y = this.moving ? Math.abs(Math.sin(this.wobble)) * 0.08 : 0;
    this.tail.rotation.y = Math.sin(this.wobble * 0.5) * 0.15;
  }
}
