import * as THREE from 'three';
import {
  BLOCK,
  COBALT,
  COBALT_SOFT,
  CURB,
  GRID,
  HALF,
  OUTER_PARKS,
  ROAD,
  ROADS,
  cssFontFamily,
  type CityContext,
  type FrameFn,
} from './constants';
import { towerGeometry } from './towers';
import type { TreeSpot } from './landmarks';

const BILLBOARD_TEXT = ['$COGN', 'WORK SEALED', 'WAGES SHARED', 'COGNITA'];

/** Kanvas billboard. Digambar ulang setelah font Martian Mono termuat (document.fonts.ready). */
function drawBillboard(c: HTMLCanvasElement, txt: string) {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  const gr = g.createLinearGradient(0, 0, 256, 100);
  gr.addColorStop(0, 'rgba(47,98,240,.92)');
  gr.addColorStop(1, 'rgba(22,56,163,.92)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 100);
  g.strokeStyle = 'rgba(237,237,245,.7)';
  g.lineWidth = 3;
  g.strokeRect(4, 4, 248, 92);
  for (let y = 0; y < 100; y += 5) {
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fillRect(0, y, 256, 1);
  }
  g.fillStyle = '#ededf5';
  g.font = `600 ${txt.length > 8 ? 24 : 30}px ${cssFontFamily('--font-mono-family', 'ui-monospace, monospace')}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(txt, 128, 52);
}

/** Skyline cincin luar, billboard, pohon, lampu jalan, pod maglev, dan drone di sekitar spire.
 *  Semua dekoratif -- tidak membawa data, jadi dikurangi di kualitas 'low'. */
export function buildAmbient(
  ctx: CityContext,
  ground: { block: (i: number, j: number) => [number, number]; pad: (x: number, z: number, c: THREE.ColorRepresentation, inset?: number, h?: number) => THREE.Mesh },
  trees: TreeSpot[],
  rand: () => number,
  rMap: THREE.Texture,
  rEmit: THREE.Texture,
) {
  const { city, quality } = ctx;
  const low = quality === 'low';

  const mk = (color: number, emissive: number, metalness: number, roughness: number) =>
    ctx.track(
      new THREE.MeshStandardMaterial({ color, map: rMap, emissive: 0xffffff, emissiveMap: rEmit, emissiveIntensity: emissive, metalness, roughness }),
    );
  const fillerWall = mk(0xf7f8fe, 0.22, 0.1, 0.4);
  const fillerGlass = mk(0xb4c6ff, 0.3, 0.65, 0.12);
  const fillerSoft = mk(0xdce4fb, 0.18, 0.2, 0.35);
  const roofW = ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  const edgeMat = ctx.track(new THREE.LineBasicMaterial({ color: 0x4f78ec, transparent: true, opacity: 0.6 }));
  const glowLine = ctx.track(new THREE.LineBasicMaterial({ color: COBALT, toneMapped: false }));

  const billboardCanvases: HTMLCanvasElement[] = [];
  const billboardTextures: THREE.CanvasTexture[] = [];
  const billboardMats = BILLBOARD_TEXT.map((txt) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 100;
    drawBillboard(c, txt);
    billboardCanvases.push(c);
    const tx = ctx.track(new THREE.CanvasTexture(c));
    tx.colorSpace = THREE.SRGBColorSpace;
    billboardTextures.push(tx);
    return ctx.track(new THREE.MeshBasicMaterial({ map: tx, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  });
  let fontsGone = false;
  document.fonts?.ready.then(() => {
    if (fontsGone) return;
    billboardCanvases.forEach((c, i) => {
      drawBillboard(c, BILLBOARD_TEXT[i]);
      billboardTextures[i].needsUpdate = true;
    });
  });

  let billboards = 0;
  for (let i = -GRID; i <= GRID; i++)
    for (let j = -GRID; j <= GRID; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) < GRID) continue;
      const [cx, cz] = ground.block(i, j);
      if (OUTER_PARKS.has(`${i},${j}`)) {
        ground.pad(cx, cz, 0xdfe7ff, 0.5, 0.05);
        for (let k = 0; k < (low ? 7 : 12); k++)
          trees.push([cx + (rand() - 0.5) * 4.8, CURB + 0.05, cz + (rand() - 0.5) * 4.8, 0.45 + rand() * 0.4]);
        continue;
      }
      const nx = rand() < 0.5 ? 2 : 3;
      const nz = rand() < 0.5 ? 2 : 3;
      const inner = BLOCK - 0.5;
      const lw = inner / nx;
      const ld = inner / nz;
      for (let a = 0; a < nx; a++)
        for (let b = 0; b < nz; b++) {
          const w = lw - 0.35 - rand() * 0.3;
          const d = ld - 0.35 - rand() * 0.3;
          const h = 1 + Math.pow(rand(), 1.9) * 5.4;
          const r0 = rand();
          const m = r0 < 0.3 ? fillerGlass : r0 < 0.55 ? fillerSoft : fillerWall;
          const bld = new THREE.Mesh(towerGeometry(w, h, d, 0.55), [m, m, roofW, roofW, m, m]);
          bld.position.set(cx - inner / 2 + lw * (a + 0.5), CURB, cz - inner / 2 + ld * (b + 0.5));
          bld.castShadow = !low;
          bld.receiveShadow = true;
          bld.add(new THREE.LineSegments(new THREE.EdgesGeometry(bld.geometry), edgeMat));
          city.add(bld);
          if (rand() < 0.45) {
            const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.06, 0.02, d + 0.06)), glowLine);
            fr.position.y = h;
            bld.add(fr);
          }
          if (h > 3.6 && rand() < 0.5 && billboards < 9) {
            billboards++;
            const bb = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.6, w * 0.9), 0.62), billboardMats[billboards % billboardMats.length]);
            bb.position.set(0, h + 0.55, 0);
            bb.rotation.y = (rand() < 0.5 ? 0 : Math.PI / 2) + Math.PI / 4;
            bld.add(bb);
          }
          ctx.grow(bld, 0.9 + Math.hypot(i, j) * 0.07 + rand() * 0.3, 0.8);
        }
    }

  // Pohon kristal (instanced).
  {
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6).translate(0, 0.25, 0),
      new THREE.MeshStandardMaterial({ color: 0xd8dbe8 }),
      trees.length,
    );
    const crown = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.46, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.3, flatShading: true, emissive: COBALT, emissiveIntensity: 0.12 }),
      trees.length,
    );
    const leaf = ['#a9c1ff', '#7da2ff', '#c4d4ff', '#5b85f5'].map((c) => new THREE.Color(c));
    const d = new THREE.Object3D();
    trees.forEach(([x, y, z, s], k) => {
      d.position.set(x, y, z);
      d.scale.setScalar(s);
      d.updateMatrix();
      trunk.setMatrixAt(k, d.matrix);
      d.position.y = y + 0.75 * s;
      d.updateMatrix();
      crown.setMatrixAt(k, d.matrix);
      crown.setColorAt(k, leaf[k % 4]);
    });
    crown.castShadow = !low;
    city.add(trunk, crown);
  }

  // Lampu jalan (instanced) di tiap persimpangan.
  {
    const spots: [number, number][] = [];
    ROADS.forEach((rx) =>
      ROADS.forEach((rz) =>
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => spots.push([rx + sx * (ROAD / 2 + 0.2), rz + sz * (ROAD / 2 + 0.2)]))),
      ),
    );
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.025, 0.035, 1.1, 6).translate(0, 0.55, 0),
      new THREE.MeshStandardMaterial({ color: 0xc9cee0, metalness: 0.5, roughness: 0.3 }),
      spots.length,
    );
    const heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: COBALT_SOFT, toneMapped: false }),
      spots.length,
    );
    const d = new THREE.Object3D();
    spots.forEach(([x, z], k) => {
      d.position.set(x, CURB, z);
      d.updateMatrix();
      poles.setMatrixAt(k, d.matrix);
      d.position.y = CURB + 1.15;
      d.updateMatrix();
      heads.setMatrixAt(k, d.matrix);
    });
    city.add(poles, heads);
  }

  // Pod maglev dengan jejak cahaya.
  const pods: { g: THREE.Group; axis: 'x' | 'z'; lane: number; dir: number; u: number; speed: number }[] = [];
  {
    const body = ctx.track(new THREE.CapsuleGeometry(0.16, 0.55, 4, 10).rotateX(Math.PI / 2));
    const trail = ctx.track(new THREE.PlaneGeometry(0.18, 1.6).rotateX(-Math.PI / 2).translate(0, 0, -1.1));
    const mats = [0x1d4ed8, 0x2f62f0, 0xffffff, 0x1d4ed8].map((c) =>
      ctx.track(new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.25 })),
    );
    const trailMat = ctx.track(
      new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
    );
    ROADS.forEach((r) =>
      (['x', 'z'] as const).forEach((axis) =>
        [1, -1].forEach((dir) => {
          const speed = 3 + rand() * 1.6;
          const start = rand() * 2 * HALF;
          for (let n = 0; n < (low ? 1 : 2); n++) {
            const g = new THREE.Group();
            const b = new THREE.Mesh(body, mats[Math.floor(rand() * 4)]);
            b.castShadow = !low;
            g.add(b);
            g.add(new THREE.Mesh(trail, trailMat));
            city.add(g);
            pods.push({ g, axis, lane: r - dir * 0.5, dir, u: ((start + n * HALF) % (2 * HALF)) - HALF, speed });
          }
        }),
      ),
    );
  }

  // Drone mengorbit spire.
  const drones: { d: THREE.Mesh; r: number; y: number; sp: number; ph: number }[] = [];
  {
    const geo = ctx.track(new THREE.OctahedronGeometry(0.13));
    const m1 = ctx.track(new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }));
    const m2 = ctx.track(new THREE.MeshBasicMaterial({ color: COBALT_SOFT, toneMapped: false }));
    for (let k = 0; k < (low ? 5 : 9); k++) {
      const d = new THREE.Mesh(geo, k % 3 ? m1 : m2);
      city.add(d);
      drones.push({ d, r: 5 + rand() * 9, y: 6 + rand() * 8, sp: (0.15 + rand() * 0.2) * (k % 2 ? 1 : -1), ph: rand() * 6 });
    }
  }

  const placePod = (p: (typeof pods)[number]) => {
    if (p.axis === 'z') {
      p.g.position.set(p.lane, 0.2, p.u);
      p.g.rotation.y = p.dir > 0 ? 0 : Math.PI;
    } else {
      p.g.position.set(p.u, 0.2, p.lane);
      p.g.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  };

  const frame: FrameFn = (t, dt) => {
    if (ctx.reduceMotion) {
      pods.forEach(placePod);
      drones.forEach((d) => d.d.position.set(Math.cos(d.ph) * d.r, d.y, Math.sin(d.ph) * d.r));
      return;
    }
    pods.forEach((p) => {
      p.u += p.dir * p.speed * dt;
      if (p.u > HALF) p.u -= 2 * HALF;
      if (p.u < -HALF) p.u += 2 * HALF;
      p.g.scale.setScalar(Math.max(0.001, Math.min(1, (HALF - Math.abs(p.u)) / 1.2)));
      placePod(p);
    });
    drones.forEach((d) => {
      const a = t * d.sp + d.ph;
      d.d.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 1.3 + d.ph) * 0.4, Math.sin(a) * d.r);
      d.d.rotation.y += dt * 2;
    });
  };

  return {
    frame,
    dispose() {
      fontsGone = true;
    },
  };
}
