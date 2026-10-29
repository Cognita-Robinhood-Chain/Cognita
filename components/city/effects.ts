import * as THREE from 'three';
import { COBALT, CURB, EMBER, type CityContext } from './constants';
import type { Tower } from './towers';

/** Efek yang membawa data:
 *  - Data stream: Wright yang sedang `working` mengalirkan percikan ke Counting House.
 *  - Seal burst: saat wage disegel, koin terbang dari gedung -- satu ke puncak Counting
 *    House, sebagian (oranye) ke Furnace, sisanya memancar ke atas (bagian patron). */
export function buildEffects(ctx: CityContext, hallTop: THREE.Vector3, furnacePos: THREE.Vector3) {
  const { city } = ctx;

  const streamMat = ctx.track(
    new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }),
  );
  const sparkGeo = ctx.track(new THREE.SphereGeometry(0.09, 10, 8));
  const sparkMat = ctx.track(new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }));
  const streams = new Map<
    string,
    { tube: THREE.Mesh; sparks: { s: THREE.Mesh; o: number }[]; curve: THREE.QuadraticBezierCurve3 }
  >();

  function curveFor(tw: Tower) {
    const p0 = tw.mesh.position.clone();
    p0.y = tw.top + 0.4;
    const p2 = new THREE.Vector3(0, CURB + 9, 0);
    const mid = p0.clone().lerp(p2, 0.5);
    mid.y = Math.max(p0.y, p2.y) + 3.5;
    return new THREE.QuadraticBezierCurve3(p0, mid, p2);
  }

  function removeStream(id: string) {
    const s = streams.get(id);
    if (!s) return;
    city.remove(s.tube);
    s.tube.geometry.dispose();
    s.sparks.forEach((p) => city.remove(p.s));
    streams.delete(id);
  }

  /** Dipanggil tiap frame; membuat/menghapus stream mengikuti status. Tidak dibuat sebelum
   *  gedung selesai tumbuh (`ready`) supaya titik awalnya di puncak yang benar. */
  function syncStreams(towers: Map<string, Tower>, ready: boolean) {
    towers.forEach((tw, id) => {
      const on = ready && tw.status === 'working';
      if (on && !streams.has(id)) {
        const curve = curveFor(tw);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.03, 6, false), streamMat);
        const sparks = [0, 0.33, 0.66].map((o) => {
          const s = new THREE.Mesh(sparkGeo, sparkMat);
          city.add(s);
          return { s, o };
        });
        city.add(tube);
        streams.set(id, { tube, sparks, curve });
      } else if (!on && streams.has(id)) {
        removeStream(id);
      }
    });
  }

  // Koin
  const coinGeo = ctx.track(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20).rotateX(Math.PI / 2));
  const coinMat = ctx.track(
    new THREE.MeshStandardMaterial({ color: 0x7da2ff, metalness: 0.8, roughness: 0.2, emissive: COBALT, emissiveIntensity: 0.5 }),
  );
  const burnMat = ctx.track(new THREE.MeshBasicMaterial({ color: EMBER, toneMapped: false }));
  const bursts: { m: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; t: number; fade: boolean }[] = [];

  function sealBurst(tw: Tower) {
    const from = tw.mesh.position.clone();
    from.y = tw.top + 0.8;
    const n = ctx.reduceMotion ? 2 : 9;
    for (let i = 0; i < n; i++) {
      const toBurn = i % 4 === 3 || (ctx.reduceMotion && i === 1);
      const m = new THREE.Mesh(coinGeo, toBurn ? burnMat : coinMat);
      m.position.copy(from);
      m.visible = false;
      city.add(m);
      const to =
        i === 0
          ? hallTop.clone()
          : toBurn
            ? furnacePos.clone()
            : from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 2, (Math.random() - 0.5) * 4));
      bursts.push({ m, from, to, t: -i * 0.07, fade: !toBurn && i !== 0 });
    }
  }

  function frame(t: number, dt: number) {
    streams.forEach((s) =>
      s.sparks.forEach((p) => s.curve.getPoint(ctx.reduceMotion ? p.o : (t * 0.45 + p.o) % 1, p.s.position)),
    );
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.t += dt / 1.3;
      const k = Math.min(1, Math.max(0, b.t));
      b.m.position.lerpVectors(b.from, b.to, k);
      b.m.position.y += Math.sin(k * Math.PI) * 3;
      b.m.rotation.y += dt * 8;
      b.m.visible = b.t > 0;
      if (b.fade) b.m.scale.setScalar(1 - k * 0.8);
      if (b.t >= 1) {
        city.remove(b.m);
        bursts.splice(i, 1);
      }
    }
  }

  return {
    syncStreams,
    sealBurst,
    frame,
    dispose() {
      [...streams.keys()].forEach(removeStream);
    },
  };
}
