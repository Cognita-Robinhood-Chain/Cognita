import * as THREE from 'three';
import {
  BLOCK,
  COBALT,
  COBALT_SOFT,
  CURB,
  HALF,
  ROAD,
  ROADS,
  cellPos,
  type CityContext,
} from './constants';

/** Platform kota (slab + pita cahaya + pilar sudut) dan tekstur jalan. Mengembalikan
 *  `block(i, j)` untuk meletakkan blok trotoar di sel grid. */
export function buildGround(ctx: CityContext) {
  const { city } = ctx;

  const slabGeo = new THREE.BoxGeometry(2 * HALF, 1.4, 2 * HALF);
  const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0xe6ecff, roughness: 0.35, metalness: 0.2 }));
  slab.position.y = -0.7;
  slab.receiveShadow = true;
  city.add(slab);

  const band = new THREE.Mesh(
    new THREE.BoxGeometry(2 * HALF + 0.08, 0.16, 2 * HALF + 0.08),
    new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }),
  );
  band.position.y = -0.3;
  city.add(band);
  const band2 = new THREE.Mesh(
    new THREE.BoxGeometry(2 * HALF + 0.05, 0.05, 2 * HALF + 0.05),
    new THREE.MeshBasicMaterial({ color: COBALT_SOFT, toneMapped: false }),
  );
  band2.position.y = -1.0;
  city.add(band2);

  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(slabGeo),
    new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.55 }),
  );
  rim.position.y = -0.7;
  city.add(rim);

  // Pilar cahaya di empat sudut platform.
  const pillarGeo = ctx.track(new THREE.CylinderGeometry(0.07, 0.07, 9, 10, 1, true).translate(0, 4.5, 0));
  const pillarMat = ctx.track(
    new THREE.MeshBasicMaterial({
      color: COBALT,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  const capGeo = ctx.track(new THREE.SphereGeometry(0.16, 12, 8));
  const capMat = ctx.track(new THREE.MeshBasicMaterial({ color: COBALT_SOFT, toneMapped: false }));
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(sx * HALF, 0, sz * HALF);
    city.add(p);
    const c = new THREE.Mesh(capGeo, capMat);
    c.position.set(sx * HALF, 9, sz * HALF);
    city.add(c);
  }

  city.add(streets(ctx.quality));

  // Blok trotoar: satu geometri & material dibagi semua blok.
  const blockGeo = ctx.track(new THREE.BoxGeometry(BLOCK, CURB, BLOCK).translate(0, CURB / 2, 0));
  const blockEdgeGeo = ctx.track(new THREE.EdgesGeometry(blockGeo));
  const blockMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xfdfdff, roughness: 0.6 }));
  const blockEdgeMat = ctx.track(new THREE.LineBasicMaterial({ color: COBALT, transparent: true, opacity: 0.4 }));

  function block(i: number, j: number): [number, number] {
    const b = new THREE.Mesh(blockGeo, blockMat);
    const [x, z] = cellPos(i, j);
    b.position.set(x, 0, z);
    b.receiveShadow = true;
    b.add(new THREE.LineSegments(blockEdgeGeo, blockEdgeMat));
    city.add(b);
    return [x, z];
  }

  /** Lantai berwarna di dalam blok (pad Ward, rumput taman). */
  function pad(x: number, z: number, color: THREE.ColorRepresentation, inset = 0.4, h = 0.03) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(BLOCK - inset, h, BLOCK - inset),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
    );
    m.position.set(x, CURB + h / 2, z);
    m.receiveShadow = true;
    city.add(m);
    return m;
  }

  return { block, pad };
}

/** Tekstur jalan: aspal kebiruan, tepi lajur bercahaya, marka tengah, zebra cross. */
function streets(quality: 'high' | 'low') {
  const PX = quality === 'high' ? 2048 : 1024;
  const s = PX / (2 * HALF);
  const X = (u: number) => (u + HALF) * s;
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2f2f8';
  g.fillRect(0, 0, PX, PX);
  g.fillStyle = '#d3daf2';
  ROADS.forEach((r) => {
    g.fillRect(X(r - ROAD / 2), 0, ROAD * s, PX);
    g.fillRect(0, X(r - ROAD / 2), PX, ROAD * s);
  });
  const lw = Math.max(1.5, PX / 680);
  g.fillStyle = 'rgba(29,78,216,.8)';
  ROADS.forEach((r) =>
    [-1, 1].forEach((sd) => {
      g.fillRect(X(r + sd * (ROAD / 2 - 0.12)) - lw / 2, 0, lw, PX);
      g.fillRect(0, X(r + sd * (ROAD / 2 - 0.12)) - lw / 2, PX, lw);
    }),
  );
  const inX = (u: number) => ROADS.some((r) => Math.abs(u - r) < ROAD / 2 + 0.7);
  g.fillStyle = 'rgba(29,78,216,.95)';
  ROADS.forEach((r) => {
    for (let u = -HALF; u < HALF; u += 1.2) {
      if (inX(u + 0.3)) continue;
      g.fillRect(X(r) - 0.04 * s, X(u), 0.08 * s, 0.6 * s);
      g.fillRect(X(u), X(r) - 0.04 * s, 0.6 * s, 0.08 * s);
    }
  });
  g.fillStyle = 'rgba(255,255,255,.95)';
  const span = ROAD - 0.4;
  const bw = span / 11;
  ROADS.forEach((rx) =>
    ROADS.forEach((rz) =>
      [-1, 1].forEach((sd) => {
        for (let b = 0; b < 6; b++) {
          g.fillRect(X(rx - span / 2 + b * bw * 2), X(rz + sd * (ROAD / 2 + 0.35) - 0.25), bw * s, 0.5 * s);
          g.fillRect(X(rx + sd * (ROAD / 2 + 0.35) - 0.25), X(rz - span / 2 + b * bw * 2), 0.5 * s, bw * s);
        }
      }),
    ),
  );
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * HALF, 2 * HALF).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }),
  );
  plane.position.y = 0.002;
  plane.receiveShadow = true;
  return plane;
}
