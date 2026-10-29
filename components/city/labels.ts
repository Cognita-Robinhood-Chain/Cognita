import * as THREE from 'three';

/* Label HTML di atas canvas (cognita-app.html `.lbl`). Gaya di-inline karena elemennya dibuat
   lewat DOM API di luar React. Posisi digerakkan lewat `transform` (tanpa reflow layout). */

const BASE: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  left: '0',
  top: '0',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  willChange: 'transform, opacity',
  transition: 'background-color .2s, color .2s',
};

export type LabelKind = 'tower' | 'ward' | 'land';

export function makeLabel(parent: HTMLElement, kind: LabelKind, text: string, dot?: string, color?: string) {
  const el = document.createElement('div');
  Object.assign(el.style, BASE);
  if (kind === 'tower') {
    Object.assign(el.style, {
      font: '500 10px/1 var(--font-mono)',
      padding: '4px 7px',
      borderRadius: '99px',
      background: 'rgba(255,255,255,.92)',
      border: '1px solid rgba(17,17,22,.08)',
      boxShadow: '0 4px 10px -4px rgba(17,17,22,.25)',
      color: '#111116',
    });
  } else if (kind === 'ward') {
    Object.assign(el.style, {
      font: '700 10.5px/1 var(--font-display)',
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      padding: '6px 11px',
      borderRadius: '99px',
      background: 'rgba(255,255,255,.92)',
      border: '1px solid rgba(17,17,22,.08)',
      boxShadow: '0 4px 10px -4px rgba(17,17,22,.25)',
      color: '#111116',
    });
  } else {
    Object.assign(el.style, {
      font: '600 9.5px/1 var(--font-mono)',
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: color ?? '#1d4ed8',
      textShadow: '0 0 6px #fff, 0 0 2px #fff',
    });
  }
  if (dot) {
    const i = document.createElement('i');
    Object.assign(i.style, {
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '99px',
      marginRight: '6px',
      background: dot,
    });
    el.appendChild(i);
  }
  el.appendChild(document.createTextNode(text));
  el.style.opacity = '0';
  parent.appendChild(el);
  return el;
}

export function setLabelActive(el: HTMLElement, on: boolean) {
  el.style.background = on ? '#1d4ed8' : 'rgba(255,255,255,.92)';
  el.style.color = on ? '#fff' : '#111116';
  el.style.borderColor = on ? 'transparent' : 'rgba(17,17,22,.08)';
  el.style.zIndex = on ? '2' : '1';
}

const v3 = new THREE.Vector3();

/** Proyeksikan titik 3D ke piksel stage. `anchor`: 'bottom' (label menggantung di atas titik),
 *  'center', atau 'top' (label di bawah titik). Disembunyikan kalau titik di luar layar.
 *  Mengembalikan posisi layar titik itu (untuk deteksi tumpang-tindih label). */
export function projectLabel(
  el: HTMLElement,
  p: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number,
  anchor: 'bottom' | 'center' | 'top' = 'bottom',
) {
  v3.copy(p).project(camera);
  const x = ((v3.x + 1) / 2) * w;
  const y = ((1 - v3.y) / 2) * h;
  const off = Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1;
  el.style.visibility = off ? 'hidden' : 'visible';
  const ty = anchor === 'bottom' ? '-100%' : anchor === 'center' ? '-50%' : '6px';
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${ty})`;
  return { x, y, off };
}

/** Ukuran label di-cache (membaca offsetWidth tiap frame memicu reflow). */
const sizes = new WeakMap<HTMLElement, { w: number; h: number }>();
export function labelSize(el: HTMLElement) {
  let s = sizes.get(el);
  if (!s || !s.w) {
    s = { w: el.offsetWidth, h: el.offsetHeight };
    sizes.set(el, s);
  }
  return s;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
