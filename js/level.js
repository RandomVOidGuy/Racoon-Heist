import * as THREE from 'three';

// Builds the museum courtyard and everything in it: lighting, walls,
// crates you can hide behind, sweeping security cameras, the patrolling
// BroomBot, the Golden Sardine on its pedestal, and the getaway
// dumpster. Returns the handles the game loop needs for detection,
// collision and win/lose checks.

const HALF = 24; // playable area is a square from -HALF to +HALF

function makeCamera(scene, x, z, baseAngle, { range = 11, halfAngle = 0.42, sweep = 0.85, speed = 0.7, phase = 0 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3c3c46, roughness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 8), poleMat);
  pole.position.y = 1.8;
  pole.castShadow = true;
  group.add(pole);

  // Rotating pivot carries the camera head and its ground vision cone
  const pivot = new THREE.Group();
  pivot.rotation.y = baseAngle;
  group.add(pivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), poleMat);
  head.position.set(0, 3.5, 0.3);
  head.castShadow = true;
  pivot.add(head);

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xaa0000, emissiveIntensity: 2 })
  );
  lens.position.set(0, 3.5, 0.7);
  pivot.add(lens);

  // Vision cone drawn flat on the ground, centered on the pivot's +Z
  const sectorGeo = new THREE.CircleGeometry(range, 24, -Math.PI / 2 - halfAngle, halfAngle * 2);
  sectorGeo.rotateX(-Math.PI / 2);
  const sectorMat = new THREE.MeshBasicMaterial({
    color: 0xffd65a,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  const sector = new THREE.Mesh(sectorGeo, sectorMat);
  sector.position.y = 0.06;
  pivot.add(sector);

  return {
    group,
    pivot,
    head,
    range,
    halfAngle,
    baseAngle,
    sweep,
    speed,
    phase,
    setSpotting(on) {
      sectorMat.color.setHex(on ? 0xff4444 : 0xffd65a);
      sectorMat.opacity = on ? 0.3 : 0.13;
    },
  };
}

function makeBroomBot(scene) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.4, metalness: 0.5 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x66ddff, emissive: 0x2299cc, emissiveIntensity: 2 })
  );
  eye.position.set(0, 1.2, 0.6);
  group.add(eye);

  const broom = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.25, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xb8912a, roughness: 1 })
  );
  broom.position.set(0, 0.15, 1.0);
  group.add(broom);

  const lamp = new THREE.PointLight(0x66ddff, 4, 6);
  lamp.position.set(0, 1.4, 0.4);
  group.add(lamp);

  scene.add(group);
  return group;
}

export function buildLevel(scene) {
  // Moon + ambient night light
  const moonLight = new THREE.DirectionalLight(0xbfd0ff, 2.4);
  moonLight.position.set(12, 20, -8);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.left = -HALF;
  moonLight.shadow.camera.right = HALF;
  moonLight.shadow.camera.top = HALF;
  moonLight.shadow.camera.bottom = -HALF;
  scene.add(moonLight);
  scene.add(new THREE.AmbientLight(0x4a5480, 1.5));

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2.5, HALF * 2.5),
    new THREE.MeshStandardMaterial({ color: 0x2a3145, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Museum walls (a simple open courtyard for now)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4258, roughness: 0.9 });
  const wallGeo = new THREE.BoxGeometry(HALF * 2, 4, 1);
  for (const [x, z, ry] of [
    [0, -HALF, 0],
    [0, HALF, 0],
    [-HALF, 0, Math.PI / 2],
    [HALF, 0, Math.PI / 2],
  ]) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 2, z);
    wall.rotation.y = ry;
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }

  // Crates to hide behind — they block camera line of sight and movement
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x6e5a3a, roughness: 1 });
  const crateSpecs = [
    { x: -7, z: 2, s: 2.2 },
    { x: 7, z: 1, s: 1.8 },
    { x: -13, z: -9, s: 2.4 },
    { x: 13, z: -10, s: 2.0 },
    { x: -5, z: 12, s: 1.8 },
    { x: 9, z: 10, s: 2.2 },
    { x: 16, z: -18, s: 2.4 },
  ];
  const obstacles = [];
  const colliders = [];
  for (const { x, z, s } of crateSpecs) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
    crate.position.set(x, s / 2, z);
    crate.rotation.y = (x * 13 + z * 7) % 1;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    obstacles.push(crate);
    colliders.push({ x, z, r: s * 0.72 });
  }

  // Pedestal with the Golden Sardine (placeholder: glowing gold box)
  const pedestalPos = new THREE.Vector3(0, 0, -10);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.3, 2, 24),
    new THREE.MeshStandardMaterial({ color: 0x8f8a9e, roughness: 0.6 })
  );
  pedestal.position.set(pedestalPos.x, 1, pedestalPos.z);
  pedestal.castShadow = true;
  scene.add(pedestal);
  colliders.push({ x: pedestalPos.x, z: pedestalPos.z, r: 1.4 });

  const sardine = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 0.5),
    new THREE.MeshStandardMaterial({
      color: 0xffd65a,
      emissive: 0xaa7700,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.25,
    })
  );
  sardine.position.set(pedestalPos.x, 2.5, pedestalPos.z);
  sardine.castShadow = true;
  scene.add(sardine);

  const sardineGlow = new THREE.PointLight(0xffd65a, 8, 10);
  sardineGlow.position.copy(sardine.position);
  scene.add(sardineGlow);

  // Getaway dumpster in the southeast corner
  const dumpsterPos = new THREE.Vector3(19, 0, 21);
  const dumpster = new THREE.Group();
  const bin = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.8, 2),
    new THREE.MeshStandardMaterial({ color: 0x2f6e3a, roughness: 0.8 })
  );
  bin.position.y = 0.9;
  bin.castShadow = true;
  dumpster.add(bin);
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.2, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x255a2e, roughness: 0.8 })
  );
  lid.position.set(0, 1.9, -0.3);
  lid.rotation.x = -0.35;
  dumpster.add(lid);
  const dumpsterGlow = new THREE.PointLight(0x44ff88, 0, 8);
  dumpsterGlow.position.set(0, 2, 0);
  dumpster.add(dumpsterGlow);
  dumpster.position.copy(dumpsterPos);
  scene.add(dumpster);
  colliders.push({ x: dumpsterPos.x, z: dumpsterPos.z, r: 1.9 });

  // Security cameras sweeping the courtyard
  const cameras = [
    makeCamera(scene, -12, -23, 0, { phase: 0 }),
    makeCamera(scene, 12, -23, 0, { phase: Math.PI }),
    makeCamera(scene, -12, 23, Math.PI, { phase: Math.PI / 2 }),
    makeCamera(scene, 12, 23, Math.PI, { phase: (3 * Math.PI) / 2 }),
  ];

  // BroomBot patrols a loop around the pedestal
  const bot = makeBroomBot(scene);
  const botWaypoints = [
    new THREE.Vector3(-8, 0, -4),
    new THREE.Vector3(8, 0, -4),
    new THREE.Vector3(8, 0, -16),
    new THREE.Vector3(-8, 0, -16),
  ];
  bot.position.copy(botWaypoints[0]);
  let botTarget = 1;

  let time = 0;

  return {
    bounds: { min: -HALF + 1.5, max: HALF - 1.5 },
    obstacles,
    colliders,
    cameras,
    bot,
    sardine,
    sardineGlow,
    pedestalPos,
    dumpsterPos,
    dumpsterGlow,

    update(dt, alarm, sardineGrabbed) {
      time += dt;

      if (!sardineGrabbed) {
        sardine.rotation.y += dt * 0.8;
        sardine.position.y = 2.5 + Math.sin(time * 1.7) * 0.15;
      }

      // Camera sweep — faster once the alarm is up
      const speedMul = alarm ? 1.8 : 1;
      for (const cam of cameras) {
        cam.pivot.rotation.y =
          cam.baseAngle + Math.sin(time * cam.speed * speedMul + cam.phase) * cam.sweep;
      }

      // BroomBot patrol
      const botSpeed = alarm ? 5 : 3;
      const target = botWaypoints[botTarget];
      const toTarget = new THREE.Vector3().subVectors(target, bot.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist < 0.3) {
        botTarget = (botTarget + 1) % botWaypoints.length;
      } else {
        toTarget.normalize();
        bot.position.addScaledVector(toTarget, Math.min(botSpeed * dt, dist));
        bot.rotation.y = Math.atan2(toTarget.x, toTarget.z);
      }
      bot.position.y = Math.abs(Math.sin(time * 8)) * 0.05;

      // Dumpster beckons during the escape
      dumpsterGlow.intensity = alarm ? 6 + Math.sin(time * 6) * 3 : 0;
    },
  };
}
