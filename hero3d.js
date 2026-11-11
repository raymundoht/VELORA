/* VELORA — Escena 3D cinematográfica
   Un solo canvas fijo detrás del hero y de "La colección" (#coleccion).
   - Hero: los equipos sobre una plataforma de mármol negro con halo rojo. Arrastra para
     girar, pasa el cursor para ver la cobertura y haz clic para ir a su ficha.
   - Al hacer scroll la cámara se abre a la vista general y recorre cada equipo:
     zoom-out → el carrusel gira → zoom-in al equipo, y su ficha entra por la derecha.
   - Si hay .glb en ./modelos/ (ver modelos/LEEME.md) sustituyen a los procedurales.
   - Sin WebGL se queda la fotografía del hero y las fichas siguen siendo legibles. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* Color de la luz ambiental (halo y contraluces). */
const ACCENT = 0xc4122f;

const art = document.querySelector('#inicio .hero-art');
const collection = document.getElementById('coleccion');
if (art && collection) init().catch(err => console.warn('[hero3d] se mantiene la foto:', err));

async function init() {
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const PLATFORM_TOP = 0.09;
  const RADIUS = 0.95;

  /* ── Contenedor fijo ──────────────────────────────────────── */
  const wrap = document.createElement('div');
  wrap.className = 'scene-3d';
  wrap.setAttribute('aria-hidden', 'true');
  const tip = document.createElement('div');
  tip.className = 'hero-3d-tip';
  const hint = document.createElement('div');
  hint.className = 'hero-3d-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.innerHTML = '<i class="fas fa-arrows-left-right"></i><span>Arrastra para girar · toca un equipo</span>';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.append(renderer.domElement, tip);

  /* ── Escena y luces ───────────────────────────────────────── */
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = studioEnvironment(pmrem);
  scene.environmentIntensity = 0.9;
  const mobileGPU = Math.min(innerWidth, innerHeight) < 600;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x120306, 0.12));
  const key = new THREE.SpotLight(0xfff4ec, 52, 16, Math.PI / 6.5, 0.75, 1.6);
  key.position.set(1.4, 6, 3.4);
  key.target.position.set(0, 0.4, 0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(mobileGPU ? 1024 : 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 8;
  scene.add(key, key.target);
  const back = new THREE.PointLight(ACCENT, 38, 9, 1.4);
  back.position.set(0, 1.8, -2.6);
  scene.add(back);
  const rimL = new THREE.DirectionalLight(ACCENT, 1.3);
  rimL.position.set(-5, 2.5, -2);
  const rimR = new THREE.DirectionalLight(0xffd6dc, 0.7);
  rimR.position.set(5, 2, -3);
  scene.add(rimL, rimR);

  // Halo rojo detrás de la plataforma
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, 'rgba(196,18,47,0.9)'], [0.35, 'rgba(120,8,28,0.45)'], [1, 'rgba(60,0,10,0)']]),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.set(9, 7, 1);
  halo.position.set(0, 1.3, -2.8);
  scene.add(halo);

  /* ── Plataforma de mármol ─────────────────────────────────── */
  const stage = new THREE.Group();
  scene.add(stage);
  const marble = marbleTexture();
  // Pedestal: cubierta de mármol y un fuste que se funde con la oscuridad
  const PLINTH = 2.6;
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.62, PLATFORM_TOP + PLINTH, 128),
    [
      new THREE.MeshPhysicalMaterial({ map: verticalFade(), roughness: 0.3, metalness: 0.75, clearcoat: 0.4 }),
      new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.18, roughnessMap: noiseTexture(4, 0.5, 0.9), metalness: 0.05,
        clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 0.22, transparent: true, opacity: 0.84 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a }),
    ]
  );
  platform.position.y = (PLATFORM_TOP - PLINTH) / 2;
  platform.receiveShadow = true;
  stage.add(platform);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.64, 0.008, 10, 180),
    new THREE.MeshBasicMaterial({ color: 0xffb3bf, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PLATFORM_TOP + 0.001;
  stage.add(ring);
  // Pozo negro bajo la cubierta: a través del mármol solo se ve el reflejo
  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 2.6, 96, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.BackSide })
  );
  well.position.y = PLATFORM_TOP - 1.3;
  stage.add(well);
  const wellFloor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 96), new THREE.MeshBasicMaterial({ color: 0x020202 }));
  wellFloor.rotation.x = -Math.PI / 2;
  wellFloor.position.y = PLATFORM_TOP - 2.6;
  stage.add(wellFloor);
  const floorGlow = new THREE.Mesh(
    new THREE.RingGeometry(1.66, 3.6, 96),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(196,18,47,0.35)'], [1, 'rgba(196,18,47,0)']]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.002;
  scene.add(floorGlow);

  /* ── Materiales ───────────────────────────────────────────── */
  const grain = noiseTexture(6, 0.35, 0.65);      // micro-textura del plástico
  const powder = noiseTexture(10, 0.0, 1.0);        // acabado en polvo de la torre
  const M = {
    white: new THREE.MeshPhysicalMaterial({
      color: 0xecebe7, roughness: 0.34, roughnessMap: grain, bumpMap: grain, bumpScale: 0.15,
      clearcoat: 0.55, clearcoatRoughness: 0.2, specularIntensity: 0.7,
    }),
    black: new THREE.MeshPhysicalMaterial({
      color: 0x0f0f10, roughness: 0.62, roughnessMap: grain, bumpMap: powder, bumpScale: 0.35,
      clearcoat: 0.18, clearcoatRoughness: 0.45, specularIntensity: 0.6,
    }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.16, anisotropy: 0.7, anisotropyRotation: Math.PI / 2 }),
    nozzle: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.85 }),
    screen: new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }),
    ledBlue: new THREE.MeshBasicMaterial({ color: 0x3b82ff }),
    ledGreen: new THREE.MeshBasicMaterial({ color: 0x34e07a }),
    ledCyan: new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
    ledRed: new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
  };
  const logoDark = logoTexture('#6f6f6f');
  const logoLight = logoTexture('#d9d9d9');
  const mistTex = radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  const contactMat = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(0,0,0,0.85)'], [0.45, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]),
    transparent: true, depthWrite: false,
  });
  // Reflejo: copia espejada bajo la cubierta translúcida de mármol
  function addReflection(holder) {
    const ud = holder.userData;
    if (ud.refl) holder.remove(ud.refl);
    const refl = ud.model.clone();
    refl.scale.y = -1;
    refl.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    holder.add(refl);
    ud.refl = refl;
  }

  /* ── Equipos ──────────────────────────────────────────────── */
  // theta: posición en la plataforma (0 = al frente). heroYaw: giro propio en el hero.
  const TIERS = [
    { id: 'chico', name: 'Equipo Chico', m2: 'Hasta 300 m²', theta: -Math.PI / 3, heroYaw: 0.35, build: buildChico },
    { id: 'mediano', name: 'Equipo Mediano', m2: 'Hasta 500 m²', theta: Math.PI / 3, heroYaw: -0.35, build: buildMediano },
    { id: 'grande', name: 'Equipo Grande', m2: 'Hasta 2000 m²', theta: Math.PI, heroYaw: Math.PI, build: buildGrande },
  ];
  const devices = TIERS.map(t => {
    const holder = new THREE.Group();
    const { model, nozzle, height } = t.build();
    holder.add(model);
    holder.userData = { tier: t, model, nozzle, height, hover: 0, w: 0 };
    stage.add(holder);
    addReflection(holder);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), contactMat);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.002;
    blob.scale.setScalar(t.id === 'grande' ? 0.95 : t.id === 'mediano' ? 1.05 : 0.6);
    blob.renderOrder = 2;
    holder.add(blob);
    holder.userData.mist = createMist(holder);
    return holder;
  });

  function buildChico() {
    const g = new THREE.Group();
    const w = 0.32, h = 1.05, d = 0.17;
    const body = mesh(new RoundedBoxGeometry(w, h, d, 8, 0.15), M.white);
    body.position.y = h / 2;
    const tab = mesh(new RoundedBoxGeometry(0.09, 0.04, 0.06, 3, 0.015), M.white);
    tab.position.set(0, h + 0.015, 0);
    const btnRing = mesh(new THREE.TorusGeometry(0.026, 0.006, 10, 32), M.chrome);
    btnRing.position.set(0, h * 0.62, d / 2 + 0.002);
    const btn = mesh(new THREE.CircleGeometry(0.022, 32), M.nozzle);
    btn.position.set(0, h * 0.62, d / 2 + 0.003);
    const led = mesh(new THREE.SphereGeometry(0.008, 12, 12), M.ledBlue);
    led.position.set(0.09, h * 0.83, d / 2 - 0.004);
    const logo = logoPlane(logoDark, 0.2);
    logo.position.set(0, h * 0.14, d / 2 + 0.003);
    g.add(body, tab, btnRing, btn, led, logo);
    return { model: g, nozzle: new THREE.Vector3(0, h + 0.05, 0), height: h };
  }
  function buildMediano() {
    const g = new THREE.Group();
    const w = 0.6, h = 0.7, d = 0.44;
    const body = mesh(new RoundedBoxGeometry(w, h, d, 8, 0.11), M.white);
    body.position.y = h / 2;
    const nozzle = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.03, 32), M.nozzle);
    nozzle.scale.z = 0.6;
    nozzle.position.set(0.14, h + 0.005, -0.05);
    const knob = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 32), M.white);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(-w / 2 - 0.012, h * 0.55, 0);
    const led = mesh(new THREE.SphereGeometry(0.009, 12, 12), M.ledGreen);
    led.position.set(0.2, h * 0.84, d / 2 - 0.004);
    const logo = logoPlane(logoDark, 0.3);
    logo.position.set(0, h * 0.6, d / 2 + 0.003);
    g.add(body, nozzle, knob, led, logo, grille(0.38, 0.13, d / 2 + 0.002, h * 0.2, 0xdedede));
    return { model: g, nozzle: new THREE.Vector3(0.14, h + 0.04, -0.05), height: h };
  }
  function buildGrande() {
    const g = new THREE.Group();
    const w = 0.46, h = 1.9, d = 0.46;
    const base = mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 48), M.black);
    base.position.y = 0.025;
    const body = mesh(new RoundedBoxGeometry(w, h - 0.12, d, 6, 0.06), M.black);
    body.position.y = 0.05 + (h - 0.12) / 2;
    const neck = mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 48), M.black);
    neck.position.y = h - 0.045;
    const cap = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.05, 64), M.chrome);
    cap.scale.z = 0.7;
    cap.position.y = h;
    const spout = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.08, 24), M.chrome);
    spout.position.y = h + 0.06;
    const logo = logoPlane(logoLight, 0.3);
    logo.position.set(0, h * 0.84, d / 2 + 0.003);
    const screen = mesh(new RoundedBoxGeometry(0.15, 0.22, 0.01, 3, 0.02), M.screen);
    screen.position.set(0, 0.32, d / 2 + 0.002);
    g.add(base, body, neck, cap, spout, logo, screen);
    for (let i = 0; i < 5; i++) {
      const seg = mesh(new THREE.PlaneGeometry(0.012, 0.018), M.ledBlue);
      seg.position.set(0.01, 0.37 - i * 0.024, d / 2 + 0.0085);
      g.add(seg);
    }
    [[M.ledRed, 0.39], [M.ledGreen, 0.365]].forEach(([mat, y]) => {
      const dot = mesh(new THREE.CircleGeometry(0.006, 16), mat);
      dot.position.set(-0.04, y, d / 2 + 0.0085);
      g.add(dot);
    });
    const power = mesh(new THREE.TorusGeometry(0.014, 0.003, 8, 24, Math.PI * 1.6), M.ledCyan);
    power.rotation.z = Math.PI * 0.7;
    power.position.set(0.035, 0.25, d / 2 + 0.0085);
    g.add(power);
    return { model: g, nozzle: new THREE.Vector3(0, h + 0.1, 0), height: h + 0.1 };
  }

  /* ── Bruma ────────────────────────────────────────────────── */
  function createMist(holder) {
    const N = 110;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: mistTex, size: 0.42, transparent: true, opacity: 0.11,
      depthWrite: false, blending: THREE.AdditiveBlending, color: 0xf3e6ea,
    }));
    pts.frustumCulled = false;
    holder.add(pts);
    const life = new Float32Array(N).map(() => Math.random());
    const vx = new Float32Array(N).map(() => (Math.random() - 0.5) * 0.3);
    return { pts, pos, life, N, vx };
  }
  function stepMist(holder, dt) {
    const { mist, nozzle } = holder.userData;
    const { pos, life, N, vx } = mist;
    for (let i = 0; i < N; i++) {
      life[i] += dt * 0.32;
      if (life[i] > 1) { life[i] -= 1; vx[i] = (Math.random() - 0.5) * 0.3; }
      const t = life[i];
      pos[i * 3] = nozzle.x + vx[i] * t * 3 + Math.sin(t * 6 + i) * 0.03 * t;
      pos[i * 3 + 1] = nozzle.y + t * 1.1;
      pos[i * 3 + 2] = nozzle.z + Math.cos(t * 5 + i) * 0.04 * t;
    }
    mist.pts.geometry.attributes.position.needsUpdate = true;
  }

  /* ── Modelos .glb opcionales (IA) ─────────────────────────── */
  const loader = new GLTFLoader();
  devices.forEach(holder => {
    loader.load(`./modelos/equipo-${holder.userData.tier.id}.glb`, gltf => swapModel(holder, gltf.scene), undefined, () => {});
  });
  function swapModel(holder, obj) {
    const ud = holder.userData;
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = ud.height / size.y;
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    holder.remove(ud.model);
    holder.add(obj);
    ud.model = obj;
    ud.nozzle.set(0, ud.height + 0.04, 0);
    addReflection(holder);
  }

  /* ── Estados de cámara por sección ────────────────────────── */
  // rot: giro de la plataforma · zoom: 0 vista general, 1 primer plano
  // bill: los equipos miran a cámara · frame: dónde cae la escena en pantalla.
  const STATES = {
    hero: { rot: 0, zoom: 0, focus: null, bill: 0, frame: 'hero' },
    overview: { rot: 0.7, zoom: 0, focus: null, bill: 1, frame: 'center' },
    chico: { rot: Math.PI / 3, zoom: 1, focus: 'chico', bill: 1, frame: 'focus' },
    mediano: { rot: -Math.PI / 3, zoom: 1, focus: 'mediano', bill: 1, frame: 'focus' },
    grande: { rot: -Math.PI, zoom: 1, focus: 'grande', bill: 1, frame: 'focus' },
    outro: { rot: -Math.PI - 1.1, zoom: 0, focus: null, bill: 1, frame: 'outro' },
  };
  const steps = [...collection.querySelectorAll('.collection-step')];
  let anchors = [];
  let W = innerWidth, H = innerHeight;
  function measure() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    anchors = [{ y: 0, s: STATES.hero }].concat(steps.map(el => {
      const r = el.getBoundingClientRect();
      return { y: r.top + scrollY + r.height / 2 - H / 2, s: STATES[el.dataset.scene] };
    }));
  }
  function frameFor(name) {
    const stacked = W < 768;           // el CSS apila el hero (texto arriba, escena abajo)
    const mobile = stacked && H > W;   // teléfono vertical: equipo arriba, ficha abajo
    if (name === 'hero') {
      const r = art.getBoundingClientRect();
      const cx = stacked ? r.left + r.width / 2 : r.left + r.width * (W < 1024 ? 0.74 : 0.71);
      const cy = r.top + r.height * (stacked ? 0.56 : 0.54);
      const fitH = H / Math.max(200, r.height), fitW = (W / Math.max(200, r.width)) * (1.45 / Math.max(0.6, camera.aspect));
      const fitSide = stacked ? 0 : 6.9 / (camera.aspect * 0.63); // que la plataforma quepa a la derecha
      return { cx, cy, dist: Math.max(8.4 * Math.max(1, fitH, stacked ? fitW : 0) * (stacked ? 0.8 : 0.82), fitSide) };
    }
    if (name === 'focus') return mobile ? { cx: W / 2, cy: H * 0.28, dist: 0 } : { cx: W * 0.36, cy: H * 0.5, dist: 0 };
    if ((name === 'outro' || name === 'center') && H < 560 && W > H) return { cx: W * 0.7, cy: H * 0.62, dist: 9 };
    const fit = 7.6 / camera.aspect; // la plataforma completa cabe a lo ancho
    const portrait = H > W;
    if (name === 'outro') return { cx: W / 2, cy: H * (portrait ? 0.68 : 0.6), dist: Math.max(9.2, fit * 1.05) };
    return { cx: W / 2, cy: H * (portrait ? 0.68 : 0.58), dist: Math.max(8.6, fit) };
  }
  const smooth = x => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Estado objetivo según el scroll
  function target() {
    const y = scrollY;
    let i = 0;
    while (i < anchors.length - 2 && y > anchors[i + 1].y) i++;
    const a = anchors[i], b = anchors[i + 1];
    const f = smooth(Math.min(1, Math.max(0, (y - a.y) / Math.max(1, b.y - a.y))));
    const A = a.s, B = b.s;
    const fa = frameFor(A.frame), fb = frameFor(B.frame);
    const dip = A.zoom > 0.5 && B.zoom > 0.5 ? Math.sin(Math.PI * f) * 0.8 : 0;
    const weights = {};
    for (const d of devices) {
      const id = d.userData.tier.id;
      weights[id] = (A.focus === id ? 1 - f : 0) + (B.focus === id ? f : 0);
    }
    return {
      rot: lerp(A.rot, B.rot, f),
      zoom: Math.max(0, lerp(A.zoom, B.zoom, f) - dip),
      bill: lerp(A.bill, B.bill, f),
      hero: A.frame === 'hero' ? 1 - f : 0,
      cx: lerp(fa.cx, fb.cx, f), cy: lerp(fa.cy, fb.cy, f),
      dist: lerp(fa.dist || 8.6, fb.dist || 8.6, f),
      weights,
    };
  }

  /* ── Interacción en el hero ───────────────────────────────── */
  art.append(hint);
  art.setAttribute('aria-label', 'Vista 3D interactiva de los equipos VELORA: Chico, Mediano y Grande. Usa las flechas izquierda y derecha para girar la plataforma.');
  art.setAttribute('title', 'Arrastra para girar los equipos');

  let drag = 0, vel = 0, dragging = false, downX = 0, lastX = 0, moved = 0;
  const pointer = new THREE.Vector2(9, 9), parallax = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let hovered = null, heroWeight = 1;

  function ndc(e) {
    pointer.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
    parallax.copy(pointer);
  }
  art.addEventListener('pointerdown', e => {
    dragging = true; moved = 0; downX = lastX = e.clientX; vel = 0;
    art.setPointerCapture?.(e.pointerId);
    hint.classList.add('is-hidden');
  });
  art.addEventListener('pointermove', e => {
    ndc(e);
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved = Math.max(moved, Math.abs(e.clientX - downX));
    drag += dx * 0.008; vel = dx * 0.008;
  }, { passive: true });
  const end = e => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6 && e.type === 'pointerup') { ndc(e); pick(); if (hovered) goTo(hovered.userData.tier.id); }
  };
  art.addEventListener('pointerup', end);
  art.addEventListener('pointercancel', end);
  art.addEventListener('pointerleave', () => { pointer.set(9, 9); parallax.set(0, 0); });
  art.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') vel = -0.06;
    if (e.key === 'ArrowRight') vel = 0.06;
  });
  addEventListener('pointermove', e => { if (heroWeight < 0.5) ndc(e); }, { passive: true });

  function pick() {
    let hit = null;
    if (heroWeight > 0.9) {
      ray.setFromCamera(pointer, camera);
      for (const d of devices) if (ray.intersectObject(d.userData.model, true).length) { hit = d; break; }
    }
    if (hit !== hovered) {
      hovered = hit;
      art.style.cursor = hit ? 'pointer' : '';
      if (hit) tip.innerHTML = `<strong>${hit.userData.tier.name}</strong><span>${hit.userData.tier.m2}</span>`;
      tip.classList.toggle('is-visible', !!hit);
    }
  }
  function goTo(id) {
    document.getElementById(`coleccion-${id}`)?.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
  }

  /* ── Fichas: entran al llegar al centro ───────────────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle('is-active', en.isIntersecting));
  }, { rootMargin: '-38% 0px -38% 0px' });
  steps.forEach(s => io.observe(s));
  collection.classList.add('has-3d');

  /* ── Bucle ────────────────────────────────────────────────── */
  const cur = { rot: 0, zoom: 0, bill: 0, cx: W / 2, cy: H / 2, dist: 8.6, hero: 1 };
  const look = new THREE.Vector3(0, 0.95, 0);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const VIEW_DIR = new THREE.Vector3(0, 0.17, 1).normalize();
  let last = performance.now(), t = 0, first = true, started = false;

  function frame(now) {
    requestAnimationFrame(frame);
    // Desvanecer al terminar la colección
    const cr = collection.getBoundingClientRect();
    const fade = Math.min(1, Math.max(0, (cr.bottom - H * 0.15) / (H * 0.55)));
    wrap.style.opacity = fade.toFixed(3);
    const show = fade > 0 && !document.hidden;
    wrap.style.visibility = show ? 'visible' : 'hidden';
    if (!show) { last = now; return; }

    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const still = reduced.matches;
    if (!still) t += dt;
    const k = still || first ? 1 : 1 - Math.pow(0.0009, dt); // suavizado cinematográfico
    first = false;

    const tg = target();
    for (const key of ['rot', 'zoom', 'bill', 'cx', 'cy', 'dist', 'hero']) cur[key] = lerp(cur[key], tg[key], k);
    heroWeight = cur.hero;

    if (!dragging) { drag += vel; vel *= 0.92; if (Math.abs(vel) < 1e-4) vel = 0; }
    // Al salir del hero, el giro manual vuelve a cero poco a poco
    if (heroWeight < 0.5 && !dragging) drag *= 1 - k;
    const sway = still ? 0 : Math.sin(t * 0.35) * 0.22 * heroWeight + Math.sin(t * 0.2) * 0.06 * (1 - cur.zoom);
    stage.rotation.y = cur.rot + drag + sway;
    floorGlow.rotation.z = stage.rotation.y;

    // Equipos: los no enfocados se abren hacia los lados y se encogen
    tmp2.set(0, 0, 0);
    let wsum = 0, focusDist = 0;
    for (const d of devices) {
      const ud = d.userData;
      ud.w = lerp(ud.w, tg.weights[ud.tier.id], k);
      const away = cur.zoom * (1 - ud.w);
      const r = RADIUS + away * 0.85;
      d.position.set(Math.sin(ud.tier.theta) * r, PLATFORM_TOP + ud.hover * 0.05, Math.cos(ud.tier.theta) * r);
      ud.refl.position.y = -2 * ud.hover * 0.05;
      d.scale.setScalar(1 - away * 0.18);
      const heroYaw = ud.tier.heroYaw - ud.tier.theta;
      d.rotation.y = lerp(heroYaw, -ud.tier.theta - stage.rotation.y, cur.bill);
      if (ud.w > 0.001) {
        d.getWorldPosition(tmp); tmp.y += ud.height * 0.55;
        tmp2.addScaledVector(tmp, ud.w); wsum += ud.w;
        focusDist += ud.w * (2.3 + ud.height * 1.85);
      }
      if (!still) stepMist(d, dt);
      ud.mist.pts.visible = !still;
    }
    const zoomEff = wsum > 0 ? cur.zoom * Math.min(1, wsum) : 0;
    const focusPt = wsum > 0 ? tmp2.divideScalar(wsum) : tmp.set(0, 0.95, 0);
    look.set(0, 0.95, 0).lerp(focusPt, zoomEff);
    const narrow = camera.aspect < 1 ? Math.max(1.6, 1.15 / camera.aspect) : 1; // pantallas angostas: alejar
    const dist = lerp(cur.dist, wsum > 0 ? (focusDist / wsum) * narrow : cur.dist, zoomEff);

    camera.position.copy(look).addScaledVector(VIEW_DIR, dist);
    if (!still) {
      camera.position.x += parallax.x * 0.35;
      camera.position.y += parallax.y * 0.2;
    }
    camera.lookAt(look);
    camera.setViewOffset(W, H, W / 2 - cur.cx, H / 2 - cur.cy, W, H);
    camera.updateProjectionMatrix();

    pick();
    for (const d of devices) {
      const ud = d.userData;
      ud.hover = lerp(ud.hover, d === hovered ? 1 : 0, still ? 1 : 0.15);
    }
    if (hovered) {
      tmp.copy(hovered.userData.nozzle).setY(hovered.userData.height + 0.15);
      hovered.localToWorld(tmp).project(camera);
      tip.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px, ${(-tmp.y * 0.5 + 0.5) * H}px) translate(-50%, -110%)`;
    }
    renderer.render(scene, camera);
    if (!started) { started = true; art.classList.add('has-3d'); wrap.classList.add('is-ready'); }
  }

  document.body.prepend(wrap);
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  document.fonts?.ready.then(measure);
  requestAnimationFrame(frame);

  /* ── Utilidades ───────────────────────────────────────────── */
  function mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function logoPlane(tex, width) {
    return new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.5),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  }
  function grille(w, h, z, y, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const geo = new THREE.ConeGeometry(0.012, 0.012, 4);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2;
      m.position.set(-w / 2 + (c + (r % 2) * 0.5) * (w / 14), y - h / 2 + r * (h / 4), z);
      g.add(m);
    }
    return g;
  }
  function logoTexture(color) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = color; x.strokeStyle = color; x.textAlign = 'center';
    x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(226, 40); x.quadraticCurveTo(250, 110, 256, 120); x.quadraticCurveTo(262, 90, 290, 30); x.stroke();
    x.font = '500 64px Georgia, "Times New Roman", serif';
    x.letterSpacing = '18px';
    x.fillText('VELORA', 265, 190);
    x.font = '600 18px Arial, sans-serif';
    x.letterSpacing = '6px';
    x.fillText('PROFESSIONAL SCENT SOLUTIONS', 262, 228);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function radialTexture(stops) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function verticalFade() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3a3a3a'); g.addColorStop(0.04, '#1c1c1c'); g.addColorStop(0.35, '#0b0b0b'); g.addColorStop(1, '#030303');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function noiseTexture(repeat, lo, hi) {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    const img = x.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = Math.round((lo + Math.random() * (hi - lo)) * 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.filter = 'blur(0.7px)';
    x.drawImage(c, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    return tex;
  }
  // Estudio fotográfico virtual: softboxes que dan reflejos creíbles en plástico y cromo
  function studioEnvironment(pmrem) {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide })));
    const panel = (w, h, pos, rgb) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.material.color.setRGB(...rgb);
      m.position.set(...pos);
      m.lookAt(0, 1, 0);
      env.add(m);
    };
    panel(9, 4, [0, 10, 1], [7, 6.8, 6.5]);       // softbox cenital
    panel(1.4, 9, [-8, 2.5, 3], [5, 5, 5]);       // tira izquierda
    panel(1.2, 9, [8, 2.5, -1], [3.2, 3.2, 3.4]); // tira derecha
    panel(12, 5, [0, 3, -10], [1.8, 0.12, 0.24]); // fondo rojo
    panel(7, 3, [0, 1, 10], [0.8, 0.78, 0.76]);   // relleno frontal
    const tex = pmrem.fromScene(env, 0.015).texture;
    env.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    return tex;
  }
  function marbleTexture() {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    const bg = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    bg.addColorStop(0, '#1b1b1d'); bg.addColorStop(1, '#0a0a0b');
    x.fillStyle = bg; x.fillRect(0, 0, S, S);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let v = 0; v < 26; v++) {
      x.beginPath();
      let px = rnd() * S, py = rnd() * S;
      x.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        const nx = px + (rnd() - 0.3) * 260, ny = py + (rnd() - 0.5) * 220;
        x.quadraticCurveTo(px + (rnd() - 0.5) * 200, py + (rnd() - 0.5) * 200, nx, ny);
        px = nx; py = ny;
      }
      const light = v % 5 === 0;
      x.strokeStyle = light ? 'rgba(220,220,225,0.32)' : 'rgba(150,150,160,0.12)';
      x.lineWidth = light ? 1.6 : 0.8 + rnd() * 2.5;
      x.filter = light ? 'blur(0.6px)' : 'blur(1.5px)';
      x.stroke();
    }
    x.filter = 'none';
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
}
