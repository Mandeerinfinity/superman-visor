// Fortress hologram — three.js is imported lazily only when this tab opens.
import { OUTLINE, SPATH, sQuads, inset } from './shield.js';
export async function createHolo(canvas, onReady) {
  const T3 = await import('../vendor/three.module.min.js');
  const renderer = new T3.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T3.SRGBColorSpace; renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new T3.Scene(), cam = new T3.PerspectiveCamera(40, 1, 0.1, 100); cam.position.set(0, 0.25, 6.4);
  const pm = new T3.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T3.RoomEnvironment(), 0.04).texture;
  scene.add(new T3.AmbientLight(0x6688ff, 0.4));
  const key = new T3.PointLight(0x9fe8ff, 30, 20); key.position.set(2, 3, 4); scene.add(key);
  const rimL = new T3.PointLight(0xff3344, 18, 20); rimL.position.set(-3, -1, 2); scene.add(rimL);
  const shape = (pts) => { const s = new T3.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, -y) : s.moveTo(x, -y)); s.closePath(); return s; };
  const root = new T3.Group(); scene.add(root); const shieldG = new T3.Group(); root.add(shieldG);
  const bev = { bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 };
  // rim
  const rimShape = shape(OUTLINE); const hole = new T3.Path(); inset(OUTLINE, 0.13).forEach(([x, y], i) => i ? hole.lineTo(x, -y) : hole.moveTo(x, -y)); hole.closePath(); rimShape.holes.push(hole);
  const redMat = new T3.MeshPhysicalMaterial({ color: 0xc0001a, metalness: 0.25, roughness: 0.14, clearcoat: 1, emissive: 0x2a0004 });
  const goldMat = new T3.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.85, roughness: 0.18, emissive: 0x5a3a00 });
  const sMat = new T3.MeshPhysicalMaterial({ color: 0xe0142c, metalness: 0.3, roughness: 0.15, clearcoat: 1, emissive: 0x3a0006 });
  const crystal = new T3.MeshPhysicalMaterial({ color: 0x9fe8ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.28, emissive: 0x0a3050, side: T3.DoubleSide, depthWrite: false });
  const rim = new T3.Mesh(new T3.ExtrudeGeometry(rimShape, { depth: 0.24, ...bev }), redMat); rim.position.z = -0.12; shieldG.add(rim);
  const field = new T3.Mesh(new T3.ExtrudeGeometry(shape(inset(OUTLINE, 0.13)), { depth: 0.1, ...bev }), goldMat); field.position.z = -0.05; shieldG.add(field);
  const sFront = new T3.Group(), sBack = new T3.Group();
  sQuads().forEach(q => { const g = new T3.ExtrudeGeometry(shape(q), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.008, bevelSegments: 1 });
    const m = new T3.Mesh(g, sMat); m.position.z = 0.06; sFront.add(m); const m2 = new T3.Mesh(g, sMat); m2.position.z = 0.06; sBack.add(m2); });
  sBack.rotation.y = Math.PI; shieldG.add(sFront, sBack);
  // soft glow halo behind the shield
  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d'); const gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,200,255,.9)'); gr.addColorStop(0.35, 'rgba(60,140,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
  const halo = new T3.Mesh(new T3.PlaneGeometry(5.5, 5.5), new T3.MeshBasicMaterial({ map: new T3.CanvasTexture(gc), transparent: true, blending: T3.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0.35, -1.2); root.add(halo);
  // holographic edge lines
  const edgeMat = new T3.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55, blending: T3.AdditiveBlending });
  shieldG.add(new T3.LineSegments(new T3.EdgesGeometry(rim.geometry, 20), edgeMat).translateZ(-0.12));
  shieldG.position.y = 0.35; shieldG.scale.setScalar(1.15);
  // crystal spires ring
  const spires = new T3.Group(); root.add(spires);
  for (let i = 0; i < 16; i++) {
    const h = 0.4 + Math.random() * 1.1, g = new T3.ConeGeometry(0.12 + Math.random() * 0.1, h, 6), m = new T3.Mesh(g, crystal);
    const a = i / 14 * Math.PI * 2, r = 2.3 + Math.random() * 0.5; m.position.set(Math.cos(a) * r, -1.5 + h / 2, Math.sin(a) * r); m.rotation.z = (Math.random() - 0.5) * 0.3; m.rotation.x = (Math.random() - 0.5) * 0.3;
    spires.add(m); const e = new T3.LineSegments(new T3.EdgesGeometry(g), edgeMat); e.position.copy(m.position); e.rotation.copy(m.rotation); spires.add(e);
  }
  // base rings
  const ringMat = new T3.MeshBasicMaterial({ color: 0x55c8ff, transparent: true, opacity: 0.5, blending: T3.AdditiveBlending, side: T3.DoubleSide, depthWrite: false });
  const rings = [1.2, 1.6, 2.5].map((r, i) => { const m = new T3.Mesh(new T3.RingGeometry(r, r + 0.03 + i * 0.01, 96), ringMat); m.rotation.x = -Math.PI / 2; m.position.y = -1.5; root.add(m); return m; });
  // projector cone of light
  const coneMat = new T3.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0.07, blending: T3.AdditiveBlending, side: T3.DoubleSide, depthWrite: false });
  const cone = new T3.Mesh(new T3.CylinderGeometry(1.25, 0.25, 2.6, 48, 1, true), coneMat); cone.position.y = -0.2; root.add(cone);
  // particles
  const NP = 600, pos = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { const a = Math.random() * 6.28, r = Math.random() * 2.2; pos.set([Math.cos(a) * r, -1.5 + Math.random() * 3.6, Math.sin(a) * r], i * 3); }
  const pg = new T3.BufferGeometry(); pg.setAttribute('position', new T3.BufferAttribute(pos, 3));
  const pts = new T3.Points(pg, new T3.PointsMaterial({ color: 0xbfefff, size: 0.035, transparent: true, opacity: 0.8, blending: T3.AdditiveBlending, depthWrite: false })); root.add(pts);

  let rotY = 0, vel = 0.4, tilt = 0.1, dragging = false, lx = 0, ly = 0, auto = true, pulse = 0, W = 0, H = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; vel = dx * 0.6; rotY += dx * 0.01; tilt = Math.max(-0.6, Math.min(0.6, tilt + dy * 0.005)); });
  const up = () => dragging = false; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const h = {
    setAuto(v) { auto = v; }, get auto() { return auto; }, pulse() { pulse = 1; },
    frame(t, dt, scale = 1) {
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      if (w !== W || hh !== H) { W = w; H = hh; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1) * scale); renderer.setSize(W, H, false); cam.aspect = W / H; cam.fov = W / H < 0.7 ? 52 : 40; cam.position.z = W / H > 1.2 ? 7.6 : 6.4; cam.updateProjectionMatrix(); }
      if (!dragging) { vel += ((auto ? 0.5 : 0) - vel) * Math.min(1, dt * 1.5); rotY += vel * dt; }
      const T = t / 1000; pulse = Math.max(0, pulse - dt * 1.2);
      shieldG.rotation.y = rotY; shieldG.rotation.x = tilt; shieldG.position.y = 0.35 + Math.sin(T * 1.2) * 0.08;
      shieldG.scale.setScalar(1.15 * (1 + pulse * 0.15 * Math.sin(pulse * 20)));
      spires.rotation.y = -rotY * 0.15; rings.forEach((r, i) => { r.rotation.z = T * (0.2 + i * 0.15) * (i % 2 ? -1 : 1); r.scale.setScalar(1 + pulse * 0.4 * (i + 1)); });
      ringMat.opacity = 0.4 + pulse * 0.5; edgeMat.opacity = 0.45 + 0.2 * Math.sin(T * 3) + pulse * 0.4; coneMat.opacity = 0.06 + pulse * 0.1;
      const p = pg.attributes.position.array; for (let i = 1; i < p.length; i += 3) { p[i] += dt * (0.25 + pulse); if (p[i] > 2.1) p[i] = -1.5; } pg.attributes.position.needsUpdate = true;
      renderer.render(scene, cam);
    }
  };
  onReady && onReady();
  return h;
}
