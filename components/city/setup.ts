import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Renderer, scene, kamera ortografis isometrik, cahaya, dan environment map.
 *  Melempar error kalau WebGL tidak tersedia -- pemanggil menampilkan fallback. */
export function createStage(quality: 'high' | 'low') {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(quality === 'high' ? 2 : 1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r184: PCFSoft sudah deprecated (PCF kini lembut)

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.75;
  room.dispose();
  pmrem.dispose();

  const camera = new THREE.OrthographicCamera(-30, 30, 30, -30, -200, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd5d9ec, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-24, 34, 8);
  sun.castShadow = true;
  const sm = quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 100 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Interactive 3D city of Cognita. Each tower is a Wright; click one to open its profile.',
  );

  return {
    renderer,
    scene,
    camera,
    canvas,
    dispose() {
      envRT.dispose();
      renderer.dispose();
    },
  };
}

/** Bidang grid "tak berujung" yang memudar ke warna latar halaman. */
export function createGroundGrid(quality: 'high' | 'low') {
  const S = quality === 'high' ? 2048 : 1024;
  const U = 140;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ededf5';
  g.fillRect(0, 0, S, S);
  const px = S / U;
  for (let i = 0; i <= U; i++) {
    g.strokeStyle = i % 5 === 0 ? 'rgba(29,78,216,.28)' : 'rgba(29,78,216,.10)';
    g.lineWidth = i % 5 === 0 ? 1.4 : 1;
    g.beginPath();
    g.moveTo(i * px, 0);
    g.lineTo(i * px, S);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * px);
    g.lineTo(S, i * px);
    g.stroke();
  }
  const rg = g.createRadialGradient(S / 2, S / 2, S * 0.16, S / 2, S / 2, S * 0.5);
  rg.addColorStop(0, 'rgba(237,237,245,0)');
  rg.addColorStop(1, 'rgba(237,237,245,1)');
  g.fillStyle = rg;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(U, U).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: t, toneMapped: false }),
  );
  ground.position.y = -1.6;
  return ground;
}
