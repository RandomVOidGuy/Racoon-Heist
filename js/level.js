import * as THREE from 'three';

// Builds the placeholder museum courtyard: ground, walls, moonlight,
// and a display pedestal for the Golden Sardine. Returns handles the
// game loop needs (bounds for movement clamping, an update hook for
// animated props).
export function buildLevel(scene) {
  const HALF = 24; // playable area is a square from -HALF to +HALF

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

  // Pedestal with the Golden Sardine (placeholder: glowing gold box)
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.3, 2, 24),
    new THREE.MeshStandardMaterial({ color: 0x8f8a9e, roughness: 0.6 })
  );
  pedestal.position.set(0, 1, -10);
  pedestal.castShadow = true;
  scene.add(pedestal);

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
  sardine.position.set(0, 2.5, -10);
  sardine.castShadow = true;
  scene.add(sardine);

  const sardineGlow = new THREE.PointLight(0xffd65a, 8, 10);
  sardineGlow.position.copy(sardine.position);
  scene.add(sardineGlow);

  return {
    bounds: { min: -HALF + 1.5, max: HALF - 1.5 },
    sardine,
    update(dt) {
      sardine.rotation.y += dt * 0.8;
      sardine.position.y = 2.5 + Math.sin(performance.now() / 600) * 0.15;
    },
  };
}
