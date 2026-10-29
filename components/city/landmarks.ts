import * as THREE from 'three';
import {
  BLOCK,
  COBALT,
  COBALT_SOFT,
  CURB,
  EMBER,
  FURNACE_CELL,
  PARK_CELL,
  WEIGH_CELL,
  WEIGH_ID,
  type CityContext,
  type FrameFn,
} from './constants';

/** [x, y, z, skala] -- pohon dikumpulkan lalu dibangun sekali sebagai InstancedMesh. */
export type TreeSpot = [number, number, number, number];

interface Ground {
  block: (i: number, j: number) => [number, number];
  pad: (x: number, z: number, color: THREE.ColorRepresentation, inset?: number, h?: number) => THREE.Mesh;
}

/** Counting House (spire kristal di pusat), Weighhouse (paviliun + hologram timbangan),
 *  Furnace (reaktor tempat 10% wage dibakar), dan taman. */
export function buildLandmarks(ctx: CityContext, ground: Ground, rand: () => number) {
  const { city, reduceMotion } = ctx;
  const trees: TreeSpot[] = [];
  const pickables: THREE.Mesh[] = [];

  /** Kaca biru bercahaya -- juga dipakai mahkota gedung Wright. */
  const glass = ctx.track(
    new THREE.MeshStandardMaterial({ color: 0x9fb8ff, metalness: 0.8, roughness: 0.1, emissive: COBALT, emissiveIntensity: 0.32 }),
  );

  // ---------- Counting House ----------
  ground.block(0, 0);
  const plazaRings = [2.7, 2.1, 1.5].map((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.05, r, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 0.5 - i * 0.1, toneMapped: false }),
    );
    ring.position.y = CURB + 0.01;
    city.add(ring);
    return ring;
  });
  const hall = new THREE.Group();
  hall.position.y = CURB;
  city.add(hall);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.1, 0.7, 6).translate(0, 0.35, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
  );
  base.castShadow = true;
  hall.add(base);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.45, 12.5, 6).translate(0, 6.25, 0), glass);
  spire.position.y = 0.7;
  spire.castShadow = true;
  spire.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(spire.geometry),
      new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.85 }),
    ),
  );
  hall.add(spire);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 6).translate(0, 1.1, 0), glass);
  cap.position.y = 13.2;
  cap.castShadow = true;
  hall.add(cap);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 14),
    new THREE.MeshBasicMaterial({ color: COBALT_SOFT, toneMapped: false }),
  );
  core.position.y = 15.6;
  hall.add(core);
  const beamMat = new THREE.MeshBasicMaterial({
    color: COBALT,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 40, 16, 1, true).translate(0, 20, 0), beamMat);
  beam.position.y = 15.6;
  hall.add(beam);
  const rings = (
    [
      [2.6, 4],
      [2.1, 8],
      [1.6, 11.4],
    ] as const
  ).map(([r, y], i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.05, 10, 96),
      new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }),
    );
    m.rotation.x = Math.PI / 2 + (i - 1) * 0.18;
    m.position.y = y;
    hall.add(m);
    return m;
  });
  // Penghalang tak terlihat: label Ward di belakang spire dibuat redup (lihat labels.ts).
  const occluderShell = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.7, 16, 12).translate(0, 8, 0),
    new THREE.MeshBasicMaterial(),
  );
  occluderShell.visible = false;
  hall.add(occluderShell);
  ctx.grow(hall, 0.1, 1.1);
  for (const [x, z] of [
    [-2.45, -2.45],
    [2.45, -2.45],
    [-2.45, 2.45],
    [2.45, 2.45],
  ])
    trees.push([x, CURB, z, 0.7]);

  // ---------- Weighhouse ----------
  const [wx, wz] = ground.block(...WEIGH_CELL);
  const weigh = new THREE.Group();
  weigh.position.set(wx, CURB, wz);
  city.add(weigh);
  const whiteMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.35, 48).translate(0, 0.175, 0), whiteMat);
  plinth.receiveShadow = plinth.castShadow = true;
  weigh.add(plinth);
  const colGeo = ctx.track(new THREE.CylinderGeometry(0.09, 0.09, 2, 10).translate(0, 1, 0));
  const colMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.3 }));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const c = new THREE.Mesh(colGeo, colMat);
    c.position.set(Math.cos(a) * 1.9, 0.35, Math.sin(a) * 1.9);
    c.castShadow = true;
    weigh.add(c);
  }
  // Kaca cakram terpisah dari `glass` supaya kilaunya bisa mengikuti Work Ratio sendiri.
  const weighGlass = glass.clone();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.2, 0.3, 48).translate(0, 0.15, 0), weighGlass);
  disc.position.y = 2.35;
  disc.castShadow = true;
  weigh.add(disc);
  const holo = new THREE.Group();
  holo.position.y = 3.2;
  weigh.add(holo);
  const holoMat = new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 0.85, toneMapped: false });
  holo.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 0.06), holoMat));
  holo.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8).translate(0, -0.45, 0), holoMat));
  for (const px of [-0.9, 0.9]) {
    const p = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 32), holoMat);
    p.rotation.x = Math.PI / 2;
    p.position.set(px, -0.45, 0);
    holo.add(p);
  }
  // Area klik Weighhouse -> /weighhouse.
  const weighHit = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 4, 16).translate(0, 2, 0), new THREE.MeshBasicMaterial());
  weighHit.visible = false;
  weighHit.userData.id = WEIGH_ID;
  weigh.add(weighHit);
  pickables.push(weighHit);
  ctx.grow(weigh, 0.45);

  // ---------- Furnace ----------
  const [fx, fz] = ground.block(...FURNACE_CELL);
  const furnace = new THREE.Group();
  furnace.position.set(fx, CURB, fz);
  city.add(furnace);
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.9, 2.6, 32, 1, true).translate(0, 1.3, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide }),
  );
  shell.castShadow = true;
  furnace.add(shell);
  const top = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.12, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xe9ebf5, metalness: 0.5, roughness: 0.25 }),
  );
  top.rotation.x = Math.PI / 2;
  top.position.y = 2.6;
  furnace.add(top);
  const coreMat = new THREE.MeshBasicMaterial({ color: EMBER.clone(), toneMapped: false });
  const furnCore = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), coreMat);
  furnCore.position.y = 1.4;
  furnace.add(furnCore);
  const furnRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 64), coreMat);
  furnRing.position.y = 1.4;
  furnace.add(furnRing);
  const stackMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xf2f3f9, metalness: 0.4, roughness: 0.3 }));
  const stackBandMat = ctx.track(new THREE.MeshBasicMaterial({ color: EMBER, toneMapped: false }));
  for (const [sx, sz] of [
    [-1.9, -1.3],
    [1.9, -1.3],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 3.6, 16).translate(0, 1.8, 0), stackMat);
    st.position.set(sx, 0, sz);
    st.castShadow = true;
    furnace.add(st);
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 24), stackBandMat);
    b.rotation.x = Math.PI / 2;
    b.position.set(sx, 3.3, sz);
    furnace.add(b);
  }
  ctx.grow(furnace, 0.5);

  // ---------- Taman ----------
  const [px, pz] = ground.block(...PARK_CELL);
  ground.pad(px, pz, 0xd9e3ff, 0.5, 0.05);
  const pool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0x9fb8ff, metalness: 0.4, roughness: 0.05, emissive: COBALT, emissiveIntensity: 0.15 }),
  );
  pool.position.set(px, CURB + 0.06, pz);
  city.add(pool);
  for (let k = 0; k < 16; k++) {
    const a = (rand() - 0.5) * (BLOCK - 1.2);
    const b = (rand() - 0.5) * (BLOCK - 1.2);
    if (Math.hypot(a, b) < 1.5) continue;
    trees.push([px + a, CURB + 0.05, pz + b, 0.5 + rand() * 0.4]);
  }

  // ---------- Animasi ----------
  let workRatio: number | null = null;
  let flareUntil = -1;
  const ringSpeed = [0.4, -0.5, 0.4];

  const frame: FrameFn = (t, dt) => {
    // Weighhouse: kilau kaca & hologram mengikuti Work Ratio 24j (0% redup, >=25% penuh).
    const k = workRatio == null ? 0 : Math.min(Math.max(workRatio, 0) / 25, 1);
    weighGlass.emissiveIntensity = 0.12 + k * 0.7;
    holoMat.opacity = 0.35 + k * 0.6;

    // Furnace: kilat ~2,6 dtk setiap ada wage yang dibakar.
    const flare = Math.max(0, flareUntil - t) / 2.6;
    furnCore.scale.setScalar(1 + flare * 0.5 + (reduceMotion ? 0 : Math.sin(t * 4) * 0.05));
    coreMat.color.setRGB(1, 0.48 + flare * 0.3, 0.36 + flare * 0.2);

    if (reduceMotion) return;
    holo.rotation.y += dt * 0.6;
    holo.position.y = 3.2 + Math.sin(t * 1.5) * 0.1;
    furnRing.rotation.x = Math.PI / 2 + t * 0.9;
    furnRing.rotation.y = t * 0.5;
    rings.forEach((r, i) => (r.rotation.z += dt * ringSpeed[i]));
    core.scale.setScalar(1 + Math.sin(t * 2.4) * 0.15);
    beamMat.opacity = 0.2 + Math.sin(t * 1.6) * 0.05;
    plazaRings.forEach((r, i) => {
      (r.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.25 * Math.max(0, Math.sin(t * 1.5 - i * 0.8));
    });
  };

  return {
    frame,
    glass,
    trees,
    pickables,
    occluders: [spire, cap, occluderShell] as THREE.Object3D[],
    hallTop: new THREE.Vector3(0, CURB + 14, 0),
    furnacePos: new THREE.Vector3(fx, CURB + 1.4, fz),
    labelAnchors: {
      weighhouse: new THREE.Vector3(wx, 4.6, wz),
      furnace: new THREE.Vector3(fx, 4.4, fz),
    },
    setWorkRatio(v: number | null) {
      workRatio = v;
    },
    flare(t: number) {
      flareUntil = t + 2.6;
    },
  };
}
