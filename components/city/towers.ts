import * as THREE from 'three';
import { DISTRICT_ORDER, WARD_COLOR_HEX, type AgentStatus, type DistrictId } from '@/types/domain';
import {
  COBALT,
  CURB,
  LOTS,
  REVIEW_HALO,
  WARDEN_HEIGHT,
  WARD_CELL,
  easeOut,
  heightFor,
  type CityContext,
} from './constants';

/** Bentuk minimal agent yang dibutuhkan kota (subset CityAgent). */
export interface TowerAgent {
  id: string;
  code: string;
  district: DistrictId;
  revenue30d: number;
  status: AgentStatus;
  isLead?: boolean;
}

export interface Tower {
  id: string;
  code: string;
  district: DistrictId;
  isLead: boolean;
  mesh: THREE.Mesh;
  wall: THREE.MeshStandardMaterial;
  map: THREE.Texture;
  emissiveMap: THREE.Texture;
  edges: THREE.LineSegments;
  crown: THREE.Group;
  halo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  /** Tinggi sekarang (dianimasikan menuju `target`). */
  h: number;
  target: number;
  revenue: number;
  status: AgentStatus;
  delay: number;
  glow: number;
  pulseAt: number;
  /** Tinggi puncak setelah animasi tumbuh (dipakai label, stream, koin). */
  top: number;
}

/** Tekstur fasad "pita jendela" futuristik (map putih + emissive biru). */
function ribbon(kind: 'map' | 'emit') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = kind === 'map' ? '#ffffff' : '#000000';
  g.fillRect(0, 0, 64, 128);
  for (let f = 0; f < 4; f++) {
    const y = f * 32;
    if (kind === 'map') {
      g.fillStyle = '#4f78ec';
      g.fillRect(0, y + 9, 64, 15);
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.fillRect(0, y + 9, 64, 3);
      g.fillStyle = 'rgba(29,78,216,.35)';
      g.fillRect(0, y + 26, 64, 2);
    } else {
      g.fillStyle = f % 2 ? '#1d4ed8' : '#3a66f0';
      g.fillRect(0, y + 9, 64, 15);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Kotak berpangkal di y=0 dengan UV sisi diulang per ~1,2 unit lebar (kolom jendela).
 *  Jumlah lantai diatur lewat `texture.repeat.y` karena tinggi berubah lewat scale.y. */
export function towerGeometry(w: number, h: number, d: number, rowsPerUnit?: number) {
  const geo = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    if (f === 2 || f === 3) continue; // atap & dasar
    const cols = Math.max(1, Math.round((f < 2 ? d : w) / 1.2));
    const rows = rowsPerUnit ? Math.max(1, Math.round(h / rowsPerUnit)) / 4 : 1;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * cols, uv.getY(i) * rows);
    }
  }
  return geo;
}

const floorsFor = (h: number) => Math.max(1, Math.round(h / 0.55)) / 4;

export function buildTowers(ctx: CityContext, agents: TowerAgent[], glass: THREE.Material) {
  const { city } = ctx;
  const baseMap = ctx.track(ribbon('map'));
  const baseEmit = ctx.track(ribbon('emit'));
  const edgeMat = ctx.track(new THREE.LineBasicMaterial({ color: 0x4f78ec, transparent: true, opacity: 0.6 }));
  const selEdgeMat = ctx.track(new THREE.LineBasicMaterial({ color: COBALT }));
  const roofMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  const mastMat = ctx.track(new THREE.MeshStandardMaterial({ color: 0xdfe3f2, metalness: 0.6, roughness: 0.3 }));
  const finGeo = ctx.track(new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 0.45, 0));
  const padRingMat = ctx.track(new THREE.MeshBasicMaterial({ color: COBALT, toneMapped: false }));

  const towers = new Map<string, Tower>();
  const pickables: THREE.Mesh[] = [];

  DISTRICT_ORDER.forEach((district, wi) => {
    // Warden di lot pertama, sisanya urut kode supaya posisi stabil antar render.
    const members = agents
      .filter((a) => a.district === district)
      .sort((a, b) => Number(!!b.isLead) - Number(!!a.isLead) || a.code.localeCompare(b.code));
    const [ci, cj] = WARD_CELL[district];
    const cx = ci * (6 + 2.2);
    const cz = cj * (6 + 2.2);
    const wardColor = new THREE.Color(WARD_COLOR_HEX[district]);

    members.forEach((a, k) => {
      // Lebih dari 4 agent per Ward tidak ada di seed; kalau terjadi, lot dirapatkan.
      const [ox, oz] = k < LOTS.length ? LOTS[k] : [((k % 3) - 1) * 1.8, (Math.floor(k / 3) - 1) * 1.8];
      const isLead = !!a.isLead;
      const w0 = isLead ? 2.0 : 2.25;
      const map = baseMap.clone();
      const emissiveMap = baseEmit.clone();
      const wall = new THREE.MeshStandardMaterial({
        color: 0xf4f6ff,
        map,
        emissive: 0xffffff,
        emissiveMap,
        emissiveIntensity: 0.28,
        metalness: 0.25,
        roughness: 0.25,
      });
      const mesh = new THREE.Mesh(towerGeometry(w0, 1, w0), [wall, wall, roofMat, roofMat, wall, wall]);
      mesh.position.set(cx + ox, CURB, cz + oz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.id = a.id;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat);
      mesh.add(edges);
      city.add(mesh);
      pickables.push(mesh);

      // Mahkota: pita warna Ward + (Warden: tiang antena) / cincin / kubus kaca.
      const crown = new THREE.Group();
      city.add(crown);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w0 + 0.08, 0.14, w0 + 0.08),
        new THREE.MeshBasicMaterial({ color: wardColor, toneMapped: false }),
      );
      band.position.y = -0.1;
      crown.add(band);
      if (isLead) {
        crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 2.2, 8).translate(0, 1.1, 0), mastMat));
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 8),
          new THREE.MeshBasicMaterial({ color: wardColor, toneMapped: false }),
        );
        tip.position.y = 2.25;
        crown.add(tip);
      } else if (k % 2) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 48), padRingMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.06;
        crown.add(ring);
      } else {
        const fin = new THREE.Mesh(finGeo, glass);
        fin.castShadow = true;
        crown.add(fin);
      }

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(w0 * 0.62, 0.045, 8, 64),
        new THREE.MeshBasicMaterial({ color: COBALT.clone(), transparent: true, opacity: 0, toneMapped: false }),
      );
      halo.rotation.x = Math.PI / 2;
      city.add(halo);

      const h = isLead ? WARDEN_HEIGHT : heightFor(a.revenue30d);
      map.repeat.set(1, floorsFor(h));
      emissiveMap.repeat.copy(map.repeat);
      towers.set(a.id, {
        id: a.id,
        code: a.code,
        district,
        isLead,
        mesh,
        wall,
        map,
        emissiveMap,
        edges,
        crown,
        halo,
        h,
        target: h,
        revenue: a.revenue30d,
        status: a.status,
        delay: 0.5 + wi * 0.16 + k * 0.07,
        glow: 0.28,
        pulseAt: -10,
        top: CURB + h,
      });
    });
  });

  /** Update per frame. `live` = data agent terbaru (Realtime), `since` = detik sejak mount.
   *  Mengembalikan id agent yang revenue-nya baru naik (wage disegel -> koin terbang). */
  function frame(
    t: number,
    dt: number,
    since: number,
    live: Map<string, TowerAgent>,
    selectedId: string | null,
    hoverId: string | null,
    onSealed: (tw: Tower) => void,
  ) {
    const reduce = ctx.reduceMotion;
    towers.forEach((tw) => {
      const a = live.get(tw.id);
      if (a) {
        tw.status = a.status;
        tw.target = tw.isLead ? WARDEN_HEIGHT : heightFor(a.revenue30d);
        if (a.revenue30d > tw.revenue + 0.5 && since > 1.5) onSealed(tw);
        tw.revenue = a.revenue30d;
      }
      if (Math.abs(tw.target - tw.h) > 0.005) {
        tw.h += (tw.target - tw.h) * Math.min(1, dt * 2.5);
        tw.map.repeat.y = floorsFor(tw.h);
        tw.emissiveMap.repeat.y = tw.map.repeat.y;
      }
      const rise = reduce ? 1 : easeOut((since - tw.delay) / 0.9);
      const hov = hoverId === tw.id;
      const sel = selectedId === tw.id;
      tw.mesh.visible = rise > 0.001;
      tw.mesh.scale.set(hov ? 1.04 : 1, Math.max(0.001, tw.h * rise), hov ? 1.04 : 1);
      tw.top = CURB + tw.h * rise;
      tw.crown.position.set(tw.mesh.position.x, tw.top, tw.mesh.position.z);
      tw.crown.visible = rise > 0.97;

      // Jendela: idle redup, dipilih lebih terang, review hangat, working berdenyut.
      const want =
        tw.status === 'working'
          ? 1.1 + (reduce ? 0 : Math.sin(t * 3 + tw.delay * 9) * 0.25)
          : tw.status === 'review'
            ? 0.7
            : sel
              ? 0.6
              : 0.28;
      tw.glow += (want - tw.glow) * Math.min(1, dt * 4);
      tw.wall.emissiveIntensity = tw.glow;
      tw.edges.material = sel || hov ? selEdgeMat : edgeMat;

      // Halo status: working cobalt, review kuning, idle hanya saat dipilih.
      tw.halo.visible = tw.crown.visible;
      tw.halo.position.set(
        tw.mesh.position.x,
        tw.top + (tw.isLead ? 2.6 : 1.1) + (reduce ? 0 : Math.sin(t * 2 + tw.delay) * 0.12),
        tw.mesh.position.z,
      );
      tw.halo.material.opacity = tw.status === 'idle' ? (sel ? 0.8 : 0) : 0.9;
      tw.halo.material.color.copy(tw.status === 'review' ? REVIEW_HALO : COBALT);
      if (!reduce) tw.halo.rotation.z += dt * 0.8;
      const sincePulse = t - tw.pulseAt;
      tw.halo.scale.setScalar(sincePulse >= 0 && sincePulse < 1.4 && !reduce ? 1 + sincePulse * 1.2 : 1);
    });
  }

  return {
    towers,
    pickables,
    frame,
    /** Tekstur fasad dasar (repeat 1x1) -- dipakai ulang skyline cincin luar. */
    ribbonMap: baseMap,
    ribbonEmit: baseEmit,
    dispose() {
      towers.forEach((tw) => {
        tw.map.dispose();
        tw.emissiveMap.dispose();
      });
    },
  };
}
