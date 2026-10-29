import * as THREE from 'three';
import { WARD_COLOR_HEX, WARD_LABEL, DISTRICT_ORDER } from '@/types/domain';
import {
  BLOCK,
  WARD_CELL,
  WEIGH_ID,
  cellPos,
  easeOut,
  mulberry32,
  type CityContext,
} from './constants';
import { createGroundGrid, createStage } from './setup';
import { buildGround } from './ground';
import { buildLandmarks } from './landmarks';
import { buildTowers, type TowerAgent } from './towers';
import { buildAmbient } from './ambient';
import { buildEffects } from './effects';
import { labelSize, makeLabel, overlaps, projectLabel, setLabelActive, type Rect } from './labels';

export interface CityOptions {
  /** Wadah canvas (position: relative). */
  stage: HTMLElement;
  /** Lapisan label di atas canvas. */
  labelsEl: HTMLElement;
  /** Data terbaru dibaca lewat getter supaya loop tidak memegang closure basi. */
  getAgents: () => TowerAgent[];
  getSelected: () => string | null;
  getWorkRatio: () => number | null;
  getBurnPulse: () => number;
  /** Klik gedung (id agent) atau landmark Weighhouse (WEIGH_ID). */
  onPick: (id: string) => void;
  /** Frame pertama sudah digambar (placeholder boleh disembunyikan). */
  onReady: () => void;
}

export interface CityHandle {
  nudge: (dir: 1 | -1) => void;
  zoomBy: (factor: number) => void;
  dispose: () => void;
}

const DRAG_RAD_PER_PX = 0.007;
const INERTIA_S = 0.4;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 3;

/** Membangun kota 3D di `stage`. Melempar error kalau WebGL tidak tersedia. */
export function createCity(opts: CityOptions): CityHandle {
  const { stage, labelsEl } = opts;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality: 'high' | 'low' =
    stage.clientWidth < 720 || window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high';

  const { renderer, scene, camera, canvas, dispose: disposeStage } = createStage(quality);
  stage.insertBefore(canvas, labelsEl);

  const tracked = new Set<{ dispose: () => void }>();
  const grows: { o: THREE.Object3D; delay: number; dur: number }[] = [];
  const city = new THREE.Group();
  scene.add(createGroundGrid(quality));
  scene.add(city);

  const ctx: CityContext = {
    scene,
    city,
    reduceMotion,
    quality,
    track: (o) => {
      tracked.add(o);
      return o;
    },
    grow: (o, delay, dur = 0.9) => {
      grows.push({ o, delay, dur });
      if (!reduceMotion) o.scale.y = 0.001;
    },
  };

  const rand = mulberry32(7);
  const ground = buildGround(ctx);
  const landmarks = buildLandmarks(ctx, ground, rand);
  // Ward: blok + lantai warna Ward, lalu gedung per agent.
  DISTRICT_ORDER.forEach((d) => {
    const [x, z] = ground.block(...WARD_CELL[d]);
    ground.pad(x, z, new THREE.Color(WARD_COLOR_HEX[d]).lerp(new THREE.Color(0xffffff), 0.62));
  });
  const initialAgents = opts.getAgents();
  const towers = buildTowers(ctx, initialAgents, landmarks.glass);
  const ambient = buildAmbient(ctx, ground, landmarks.trees, rand, towers.ribbonMap, towers.ribbonEmit);
  const effects = buildEffects(ctx, landmarks.hallTop, landmarks.furnacePos);
  const pickables: THREE.Object3D[] = [...towers.pickables, ...landmarks.pickables];

  // ---------- Label ----------
  const towerLabels = new Map<string, HTMLDivElement>();
  towers.towers.forEach((tw, id) => towerLabels.set(id, makeLabel(labelsEl, 'tower', tw.code)));
  const wardLabels = DISTRICT_ORDER.map((d) => {
    const [ci, cj] = WARD_CELL[d];
    const [cx, cz] = cellPos(ci, cj);
    return {
      el: makeLabel(labelsEl, 'ward', WARD_LABEL[d], WARD_COLOR_HEX[d]),
      cx,
      cz,
      // Diperbarui tiap frame: sudut blok yang paling dekat ke kamera (lihat loop).
      pos: new THREE.Vector3(cx, 0.25, cz),
      hidden: false,
    };
  });
  const landLabels = [
    { el: makeLabel(labelsEl, 'land', 'Weighhouse'), pos: landmarks.labelAnchors.weighhouse, delay: 1 },
    { el: makeLabel(labelsEl, 'land', 'Furnace', undefined, '#c03a3a'), pos: landmarks.labelAnchors.furnace, delay: 1.1 },
  ];

  // ---------- Kamera ----------
  let theta = Math.PI / 4;
  let thetaVel = 0;
  let target: number | null = null;
  let zoom = 1;
  let w = 1;
  let h = 1;
  function place() {
    camera.position.set(60 * Math.cos(theta), 54, 60 * Math.sin(theta));
    camera.lookAt(0, 2.6, 0);
  }
  function layout() {
    w = stage.clientWidth;
    h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // Layar tegak: kota sedikit terpotong di sisi (cincin skyline) supaya Ward tetap besar.
    const v = aspect < 1.2 ? Math.max(20.5, 19.5 / aspect) : 20.5;
    camera.left = -v * aspect;
    camera.right = v * aspect;
    camera.top = v;
    camera.bottom = -v;
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(stage);
  layout();
  place();

  // ---------- Input ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hover: string | null = null;
  let drag: { x: number; y: number; theta: number; moved: number; lastX: number; lastT: number } | null = null;
  function hit(e: PointerEvent): string | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const found = ray.intersectObjects(pickables, false)[0];
    return found ? (found.object.userData.id as string) : null;
  }
  const onDown = (e: PointerEvent) => {
    drag = { x: e.clientX, y: e.clientY, theta, moved: 0, lastX: e.clientX, lastT: performance.now() };
    thetaVel = 0;
    target = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(e.clientY - drag.y));
      theta = drag.theta - dx * DRAG_RAD_PER_PX;
      const now = performance.now();
      const inst = (-(e.clientX - drag.lastX) * DRAG_RAD_PER_PX) / Math.max((now - drag.lastT) / 1000, 0.001);
      thetaVel = 0.6 * inst + 0.4 * thetaVel;
      drag.lastX = e.clientX;
      drag.lastT = now;
      if (drag.moved >= 6) canvas.style.cursor = 'grabbing';
      place();
      return;
    }
    hover = hit(e);
    canvas.style.cursor = hover ? 'pointer' : 'grab';
  };
  const endDrag = (e: PointerEvent, allowClick: boolean) => {
    if (!drag) return;
    const wasClick = drag.moved < 6;
    if (wasClick || performance.now() - drag.lastT > 80 || reduceMotion) thetaVel = 0;
    drag = null;
    if (allowClick && wasClick) {
      const id = hit(e);
      if (id) opts.onPick(id);
    }
    hover = hit(e);
    canvas.style.cursor = hover ? 'pointer' : 'grab';
  };
  const onUp = (e: PointerEvent) => endDrag(e, true);
  const onCancel = (e: PointerEvent) => endDrag(e, false);
  const onLeave = () => {
    if (!drag) hover = null;
  };
  const zoomBy = (f: number) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * f));
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 0.92 : 1.08);
  };
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // ---------- Loop ----------
  const occRay = new THREE.Raycaster();
  const camDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const labelPos = new THREE.Vector3();
  let lastOcc = -1;
  let burnSeen = -1;
  let raf = 0;
  let running = false;
  let ready = false;
  const t0 = performance.now() / 1000;
  let last = performance.now();
  const growEnd = Math.max(...grows.map((g) => g.delay + g.dur), 2.5) + 0.2;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const since = t - t0;
    const g = (d: number, dur = 0.9) => (reduceMotion ? 1 : easeOut((since - d) / dur));

    // Rotasi: tombol (target), lalu inersia setelah drag.
    if (!drag) {
      if (target != null) {
        theta += (target - theta) * Math.min(1, dt * (reduceMotion ? 60 : 5));
        if (Math.abs(target - theta) < 0.001) {
          theta = target;
          target = null;
        }
        place();
      } else if (Math.abs(thetaVel) > 0.0005) {
        theta += thetaVel * dt;
        thetaVel *= Math.exp(-dt / INERTIA_S);
        place();
      }
    }

    if (since < growEnd) grows.forEach((o) => (o.o.scale.y = Math.max(0.001, g(o.delay, o.dur))));

    // Data terbaru tiap frame -- perubahan status/revenue dari Realtime langsung terlihat.
    const live = new Map(opts.getAgents().map((a) => [a.id, a]));
    towers.towers.forEach((tw) => {
      const a = live.get(tw.id);
      // Job baru diambil Wright: halo berdenyut sekali.
      if (a && tw.status === 'idle' && a.status === 'working' && since > 1.5) tw.pulseAt = t;
    });
    const selected = opts.getSelected();
    towers.frame(t, dt, since, live, selected, hover, (tw) => {
      effects.sealBurst(tw);
      landmarks.flare(t);
    });
    effects.syncStreams(towers.towers, since > growEnd);

    landmarks.setWorkRatio(opts.getWorkRatio());
    const bp = opts.getBurnPulse();
    if (bp !== burnSeen) {
      if (burnSeen !== -1) landmarks.flare(t);
      burnSeen = bp;
    }
    landmarks.frame(t, dt);
    ambient.frame(t, dt);
    effects.frame(t, dt);

    // Label
    // Kota sempit (ponsel): label kode hanya untuk gedung aktif / dipilih / di-hover.
    const compact = w < 560;
    const towerRects: Rect[] = [];
    towers.towers.forEach((tw, id) => {
      const el = towerLabels.get(id)!;
      const sel = selected === id;
      const hov = hover === id;
      const showIdle = !compact || tw.status !== 'idle' || sel || hov;
      labelPos.set(tw.mesh.position.x, tw.top + (tw.status === 'idle' && !sel ? 0.9 : tw.isLead ? 3.2 : 1.9), tw.mesh.position.z);
      const p = projectLabel(el, labelPos, camera, w, h);
      setLabelActive(el, sel || hov);
      const op = showIdle ? g(tw.delay + 0.4, 0.4) : 0;
      el.style.opacity = String(op);
      if (op > 0.05 && !p.off) {
        const sz = labelSize(el);
        towerRects.push({ x: p.x - sz.w / 2, y: p.y - sz.h, w: sz.w, h: sz.h });
      }
    });
    const doOcc = t - lastOcc > 0.3;
    if (doOcc) {
      lastOcc = t;
      camera.getWorldDirection(camDir);
    }
    // Label Ward di sudut blok yang paling dekat ke kamera (di jalan, di depan menaranya
    // sendiri), lalu diredupkan kalau tetap tertutup label kode gedung -- legend tetap
    // menyebut semua Ward.
    const sx = Math.sign(Math.cos(theta)) || 1;
    const sz = Math.sign(Math.sin(theta)) || 1;
    wardLabels.forEach((wl) => {
      wl.pos.set(wl.cx + sx * (BLOCK / 2 + 0.15), 0.25, wl.cz + sz * (BLOCK / 2 + 0.15));
      if (doOcc) {
        occRay.set(tmp.copy(wl.pos).addScaledVector(camDir, -100), camDir);
        const found = occRay.intersectObjects(landmarks.occluders, false)[0];
        wl.hidden = !!found && found.distance < 99.5;
      }
      const p = projectLabel(wl.el, wl.pos, camera, w, h, 'top');
      const s2 = labelSize(wl.el);
      const r: Rect = { x: p.x - s2.w / 2, y: p.y + 6, w: s2.w, h: s2.h };
      const covered = towerRects.some((tr) => overlaps(r, tr));
      wl.el.style.opacity = String(g(1.2, 0.4) * (wl.hidden || covered ? 0.2 : 1));
    });
    landLabels.forEach((l) => {
      projectLabel(l.el, l.pos, camera, w, h);
      l.el.style.opacity = String(g(l.delay, 0.4));
    });

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady();
    }
    raf = requestAnimationFrame(frame);
  }

  // Loop berhenti saat tab tersembunyi atau kota di luar layar -- hemat baterai/GPU.
  let inView = true;
  const start = () => {
    if (running || document.hidden || !inView) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) start();
    else stop();
  });
  io.observe(stage);
  start();

  return {
    nudge(dir) {
      const base = target ?? theta;
      if (reduceMotion) {
        theta = base - (dir * Math.PI) / 2;
        target = null;
        place();
      } else {
        target = base - (dir * Math.PI) / 2;
      }
      thetaVel = 0;
    },
    zoomBy,
    dispose() {
      stop();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      effects.dispose();
      ambient.dispose();
      towers.dispose();
      // Semua geometri, material, dan tekstur di scene (termasuk koin yang masih terbang).
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mat) => {
          const s = mat as THREE.MeshStandardMaterial;
          s.map?.dispose();
          s.emissiveMap?.dispose();
          mat.dispose();
        });
      });
      tracked.forEach((o) => o.dispose());
      towerLabels.forEach((el) => el.remove());
      wardLabels.forEach((l) => l.el.remove());
      landLabels.forEach((l) => l.el.remove());
      disposeStage();
      canvas.remove();
    },
  };
}

export { WEIGH_ID };
