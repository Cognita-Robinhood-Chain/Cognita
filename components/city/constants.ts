import * as THREE from 'three';
import type { DistrictId } from '@/types/domain';

/* Tata kota dari cognita-app.html: grid 5x5 blok, Counting House di pusat, lima Ward di
   blok dalam, Weighhouse / Furnace / taman di tiga blok dalam sisanya, skyline di cincin luar. */

export const BLOCK = 6;
export const ROAD = 2.2;
export const PITCH = BLOCK + ROAD;
export const GRID = 2;
export const CURB = 0.18;
export const HALF = GRID * PITCH + BLOCK / 2 + 0.9;
export const ROADS = [-1.5, -0.5, 0.5, 1.5].map((k) => k * PITCH);

export const WARD_CELL: Record<DistrictId, [number, number]> = {
  research: [0, -1],
  onchain: [1, 0],
  creative: [0, 1],
  security: [-1, 0],
  community: [-1, -1],
};
export const WEIGH_CELL: [number, number] = [1, -1];
export const FURNACE_CELL: [number, number] = [1, 1];
export const PARK_CELL: [number, number] = [-1, 1];
/** Blok cincin luar yang jadi taman (bukan gedung). */
export const OUTER_PARKS = new Set(['-2,2', '2,-2']);

/** Empat lot gedung di dalam satu blok Ward. */
export const LOTS: [number, number][] = [
  [-1.5, -1.5],
  [1.5, -1.5],
  [-1.5, 1.5],
  [1.5, 1.5],
];

/** id khusus untuk landmark Weighhouse yang bisa diklik (bukan id agent). */
export const WEIGH_ID = '__weighhouse__';

export const WARDEN_HEIGHT = 7.2;
/** Tinggi gedung Wright dari revenue (wage kotor yang sudah disegel). Sama dengan desain. */
export const heightFor = (revenue30d: number) => Math.min(10, 2.6 + Math.max(0, revenue30d) / 1100);

export const cellPos = (i: number, j: number): [number, number] => [i * PITCH, j * PITCH];

export const COBALT = new THREE.Color('#1d4ed8');
export const COBALT_SOFT = new THREE.Color('#7da2ff');
export const REVIEW_HALO = new THREE.Color('#d98a00');
export const EMBER = new THREE.Color('#ff7a5c');

export const easeOut = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

/** PRNG kecil dengan seed tetap -- skyline & pohon selalu sama di setiap mount. */
export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Konteks bersama yang dioper ke tiap modul pembangun kota. */
export interface CityContext {
  scene: THREE.Scene;
  /** Semua objek kota berada di grup ini. */
  city: THREE.Group;
  reduceMotion: boolean;
  /** 'low' = layar kecil / layar sentuh: bayangan & dekorasi dikurangi. */
  quality: 'high' | 'low';
  /** Daftarkan objek yang harus di-dispose walau tidak menempel di scene. */
  track: <T extends { dispose: () => void }>(o: T) => T;
  /** Animasi "tumbuh" (scale.y) saat kota pertama muncul. */
  grow: (o: THREE.Object3D, delay: number, dur?: number) => void;
}

/** Hasil tiap modul: fungsi update per frame (opsional). */
export type FrameFn = (t: number, dt: number) => void;

/** Nama keluarga font yang dimuat next/font (variabel CSS di <html>), untuk teks di canvas. */
export function cssFontFamily(variable: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}
