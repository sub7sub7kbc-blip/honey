// Realistic 3D honeybee (Three.js, procedural — no model files).
// Banded amber abdomen, fuzzy thorax, glossy compound eyes, antennae,
// tucked legs, veined translucent wings that flap. Flies a loop across the
// slider, or the flower -> hive journey over the film. Pauses offscreen.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function speckle(g, w, h, n, colors, size) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    g.globalAlpha = 0.12 + Math.random() * 0.25;
    const x = Math.random() * w;
    const y = Math.random() * h;
    g.fillRect(x, y, size * (0.5 + Math.random()), size * (0.5 + Math.random()));
  }
  g.globalAlpha = 1;
}

// Abdomen: canvas top = rear of the bee (poles end up along X after rotation),
// so the dark bands sit in the top half of the canvas.
function abdomenTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#7a4a16');
    grad.addColorStop(0.25, '#a5661f');
    grad.addColorStop(0.6, '#c98f3a');
    grad.addColorStop(1, '#d9a441');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // dark bands across the rear two-thirds — soft brown-black, not pure black,
    // with feathered edges so they read as fur bands, not cartoon stripes
    const bands = [
      [0.05, 0.12],
      [0.23, 0.12],
      [0.41, 0.11],
    ];
    for (const [y0, bh] of bands) {
      const bg = g.createLinearGradient(0, h * y0, 0, h * (y0 + bh));
      bg.addColorStop(0, 'rgba(46,28,10,0)');
      bg.addColorStop(0.25, 'rgba(46,28,10,0.92)');
      bg.addColorStop(0.75, 'rgba(46,28,10,0.92)');
      bg.addColorStop(1, 'rgba(46,28,10,0)');
      g.fillStyle = bg;
      g.fillRect(0, h * y0, w, h * bh);
    }
    // rear tip dark
    g.fillStyle = '#1c0f04';
    g.fillRect(0, 0, w, h * 0.035);
    speckle(g, w, h, 2200, ['#8a5a20', '#e8b45c', '#5d3a12', '#3a2410'], 2.5);
  });
}

function thoraxTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#c1903f';
    g.fillRect(0, 0, w, h);
    // dense short fur strokes — stronger contrast so the fuzz reads at small sizes
    for (let i = 0; i < 2400; i++) {
      g.strokeStyle = ['#8a5f22', '#e0aa52', '#6e4a1a', '#f0c06a'][(Math.random() * 4) | 0];
      g.globalAlpha = 0.2 + Math.random() * 0.35;
      g.lineWidth = 1.2;
      const x = Math.random() * w;
      const y = Math.random() * h;
      const a = Math.random() * Math.PI;
      const l = 2 + Math.random() * 5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.globalAlpha = 1;
    // darker saddle on top
    const grad = g.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h * 0.3, w * 0.6);
    grad.addColorStop(0, 'rgba(90,55,15,0.35)');
    grad.addColorStop(1, 'rgba(90,55,15,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function wingTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // smoky tint — strong enough to read as a wing, still translucent
    g.fillStyle = 'rgba(215,210,200,0.55)';
    g.fillRect(0, 0, w, h);
    // veins fanning from the base (right edge = wing base in UV space)
    g.strokeStyle = 'rgba(70,58,44,0.8)';
    g.lineWidth = 2.6;
    const bx = w - 4;
    const by = h * 0.55;
    const tips = [
      [w * 0.05, h * 0.12],
      [w * 0.1, h * 0.42],
      [w * 0.28, h * 0.78],
      [w * 0.55, h * 0.92],
      [w * 0.85, h * 0.85],
    ];
    for (const [tx, ty] of tips) {
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(w * 0.55, (by + ty) / 2, tx, ty);
      g.stroke();
    }
    // leading edge
    g.strokeStyle = 'rgba(70,58,44,0.9)';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(w * 0.5, h * 0.08, w * 0.06, h * 0.2);
    g.stroke();
  });
}

function limb(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.75, len, 6), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function buildBee() {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x20140a, roughness: 0.7 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1f130a, roughness: 0.25, metalness: 0.2 });

  // Abdomen — sphere with poles along X (rotation.z = PI/2), banded texture.
  const abdomen = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshStandardMaterial({ map: abdomenTexture(), roughness: 0.75 })
  );
  abdomen.rotation.z = Math.PI / 2;
  abdomen.scale.set(0.95, 1.7, 0.95);
  group.add(abdomen);

  // Thorax — fuzzy golden ball at the front of the abdomen.
  const thorax = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshStandardMaterial({ map: thoraxTexture(), roughness: 1 })
  );
  thorax.scale.set(1.05, 0.95, 0.95);
  thorax.position.set(1.35, 0.08, 0);
  group.add(thorax);

  // Head — small dark ball, tucked close to the thorax so the body reads as one.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), dark);
  head.position.set(2.15, 0.08, 0);
  group.add(head);

  // Compound eyes — oval, on the sides of the head, dark brown and glossy.
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), eyeMat);
    eye.position.set(2.42, 0.22, s * 0.36);
    eye.scale.set(1, 1.1, 0.7);
    group.add(eye);
  }

  // Antennae — thin curved tubes.
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.62, 0.42, s * 0.12),
      new THREE.Vector3(2.95, 0.6, s * 0.28),
      new THREE.Vector3(3.15, 0.52, s * 0.42),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.025, 6), dark));
  }

  // Stinger — small dark cone at the rear.
  const sting = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12), dark);
  sting.rotation.z = Math.PI / 2;
  sting.position.set(-1.85, 0, 0);
  group.add(sting);

  // Legs — 3 short pairs tucked under the thorax, barely peeking out in flight.
  for (const x of [0.85, 1.35, 1.85]) {
    for (const s of [-1, 1]) {
      const hip = new THREE.Vector3(x, -0.5, s * 0.48);
      const knee = new THREE.Vector3(x - 0.1, -0.78, s * 0.72);
      const foot = new THREE.Vector3(x - 0.28, -0.92, s * 0.82);
      group.add(limb(hip, knee, 0.04, dark));
      group.add(limb(knee, foot, 0.03, dark));
    }
  }

  // Wings — forewing + smaller hindwing per side, pivoted at the thorax top.
  const wingMat = new THREE.MeshStandardMaterial({
    map: wingTexture(),
    transparent: true,
    opacity: 0.9,
    roughness: 0.35,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(-0.55, 0.85, -1.45, 0.95);
  wingShape.quadraticCurveTo(-2.15, 0.9, -2.2, 0.38);
  wingShape.quadraticCurveTo(-2.0, 0.02, -0.95, -0.06);
  wingShape.quadraticCurveTo(-0.3, -0.1, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 12);

  const pivots = {};
  for (const s of [-1, 1]) {
    const key = s === 1 ? 'right' : 'left';
    const pivot = new THREE.Group();
    pivot.position.set(1.15, 0.78, s * 0.16);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.rotation.x = s === 1 ? Math.PI / 2 : -Math.PI / 2;
    pivot.add(wing);
    // hindwing — smaller, set back, flaps with a slight lag
    const hind = new THREE.Mesh(wingGeo, wingMat);
    hind.scale.set(0.6, 0.6, 0.6);
    hind.position.set(-0.35, -0.06, s * 0.06);
    hind.rotation.x = s === 1 ? Math.PI / 2 : -Math.PI / 2;
    pivot.add(hind);
    group.add(pivot);
    pivots[key] = pivot;
  }
  // Wings rest in a V (dihedral ~31°) so they read from the side, not edge-on.
  return { group, pivots, wingBase: 0.55 };
}

// Journey path keyframes: [time fraction, left fraction, top fraction]
// (same path the old 2D bee flew: flower -> hive -> comb -> back to flower)
const JOURNEY_KEYS = [
  [0.0, 0.03, 0.62],
  [0.16, 0.03, 0.62],
  [0.32, 0.34, 0.2],
  [0.48, 0.3, 0.52],
  [0.56, 0.3, 0.52],
  [0.72, 0.74, 0.58],
  [0.88, 0.4, 0.24],
  [1.0, 0.03, 0.62],
];

function journeyPos(frac, halfW, halfH) {
  let i = 0;
  while (i < JOURNEY_KEYS.length - 2 && frac > JOURNEY_KEYS[i + 1][0]) i++;
  const [t0, x0, y0] = JOURNEY_KEYS[i];
  const [t1, x1, y1] = JOURNEY_KEYS[i + 1];
  const k = t1 === t0 ? 0 : Math.min(1, Math.max(0, (frac - t0) / (t1 - t0)));
  const e = k * k * (3 - 2 * k); // smoothstep
  const lx = x0 + (x1 - x0) * e;
  const ly = y0 + (y1 - y0) * e;
  const dx = (x1 - x0) * (t1 === t0 ? 0 : 1);
  return { x: (lx - 0.5) * halfW * 2, y: (0.5 - ly) * halfH * 2, dir: dx };
}

export default function Bee3D({ mode = 'slider', className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xfff2dd, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 6, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffe0b0, 0.55);
    fill.position.set(-6, -2, 4);
    scene.add(fill);

    const bees = [];
    if (mode === 'slider') {
      // Top band only: the text sits vertically centred on the left, so the
      // bees fly above it (never over the words, the badge pill or buttons).
      // Band is measured and TIGHT: the pill's top edge sits at world
      // y = 1.96 and the lowest visible bee pixel is ~0.16 below its centre,
      // so the centre must stay above ~2.15. The ceiling is perspective:
      // a bee flying closer to the camera (z up to +0.6) looks bigger, so
      // its wing tops reach the hero's top edge (3.79) sooner — with the
      // flap at 0.3 the wings reach ~0.86 above the centre, so the centre
      // must stay below ~2.6. The old band (2.55-2.75, flap 0.45) clipped
      // intermittently on the live site; this one clears both sides.
      const defs = [
        { scale: 0.55, yBase: 2.5, loop: 24, phase: 0, z: -0.4 },
        { scale: 0.42, yBase: 2.42, loop: 32, phase: 9, z: 0.1 },
        { scale: 0.5, yBase: 2.35, loop: 28, phase: 17, z: 0.4 },
      ];
      for (const d of defs) {
        const b = buildBee();
        b.group.scale.setScalar(d.scale);
        scene.add(b.group);
        bees.push({ ...b, ...d, x: -8 });
      }
    } else {
      const b = buildBee();
      b.group.scale.setScalar(0.32);
      b.wingBase = 0.7; // wings held higher so they read on the busy film photos
      scene.add(b.group);
      bees.push({ ...b, scale: 0.32, loop: 20, phase: 0, z: 0.3, yaw: 0 });
    }

    let w = 1;
    let h = 1;
    const resize = () => {
      w = el.clientWidth || 1;
      h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    let t = Math.random() * 10;

    const visibleHeight = () => 2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * 12;
    const visibleWidth = () => visibleHeight() * (w / h);

    // Spread the bees across the flight path at start (phase = position in
    // the loop). They used to all start at x: -8, which is in-frame on a
    // wide desktop but far off-screen on a phone — the hero then showed no
    // bee for the first ~15s, and the pack crossed together after that.
    if (mode === 'slider') {
      const hw = visibleWidth() / 2;
      for (const b of bees) b.x = -hw - 2.5 + (b.phase / b.loop) * (hw * 2 + 5);
    }

    // Wing flap: 19Hz. Amplitude 0.3 (not 0.45) — at 0.45 the wings rose
    // high enough to clip at the hero's top edge on the live site; 0.3
    // still flaps visibly while keeping the wing tops inside the slider.
    const flap = (tt, phase = 0) => 0.12 + Math.sin(tt * Math.PI * 2 * 19 + phase) * 0.3;

    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      t += dt;
      const halfW = visibleWidth() / 2;
      const halfH = visibleHeight() / 2;
      for (const b of bees) {
        if (mode === 'slider') {
          const span = halfW * 2 + 5;
          const speed = span / b.loop;
          b.x += speed * dt;
          // Portrait (mobile): the text sits at the bottom, so keep the bees
          // in the TOP band only — never down near the bottom/text. The floor
          // is 1.6 (was 0.7): the bees used to fly low over the bottom half
          // of the hero on a phone, which read as a "bottom animation".
          // Ceiling 2.5: same perspective rule as desktop (a bee at z +0.6
          // looks bigger, so its wings would clip at the top edge above it).
          const portrait = w / h < 1;
          if (b.x > halfW + 2.5) {
            b.x = -halfW - 2.5;
            b.yBase = portrait ? 1.6 + Math.random() * 0.9 : 2.35 + Math.random() * 0.15;
          }
          const yBase = portrait ? Math.min(Math.max(b.yBase, 1.6), 2.5) : Math.min(Math.max(b.yBase, 2.35), 2.5);
          // No vertical bob: the bees fly in a straight line at the top, so
          // they never dip down toward the bottom of the hero.
          const bob = 0;
          b.group.position.set(b.x, yBase + bob, b.z + Math.sin(t * 0.8 + b.phase) * 0.2);
          // slight nose-up pitch, like a real bee in flight
          b.group.rotation.set(Math.sin(t * 1.1 + b.phase) * 0.05, 0, 0.1 + Math.sin(t * 0.9 + b.phase) * 0.05);
        } else {
          const frac = ((t + b.phase) % b.loop) / b.loop;
          const p = journeyPos(frac, halfW, halfH);
          const bob = Math.sin(t * 1.7) * 0.22;
          b.group.position.set(p.x, p.y + bob, b.z);
          const targetYaw = p.dir >= 0 ? 0 : Math.PI;
          let dy = targetYaw - b.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          b.yaw += dy * Math.min(1, dt * 4);
          b.group.rotation.set(0, b.yaw, 0.1 + Math.sin(t * 0.9) * 0.05);
        }
        const f = flap(t, b.phase);
        b.pivots.right.rotation.x = -(b.wingBase + f);
        b.pivots.left.rotation.x = b.wingBase + f;
      }
      renderer.render(scene, camera);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (visible) render();
    };
    if (reduced) {
      render();
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [mode]);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
