// Живой фон: частицы стягиваются к нулевым изолиниям анимированного шума и текут вдоль них —
// получаются «нити» как на обложке Rhino + Grasshopper. Canvas 2D, без библиотек.
// ponytail: CPU-рендер с потолком 1280 px по ширине; WebGL — если понадобится 4K без масштабирования.
const Field = (() => {
  const canvas = document.createElement('canvas');
  canvas.className = 'field';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Improved Perlin noise 3D
  const perm = new Uint8Array(512);
  { const p = [...Array(256).keys()]; let s = 20261005;
    for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }

  const THEMES = {
    dark:  { bg: [22, 16, 16],   fg: [255, 255, 255], i: 1 },
    video: { bg: [22, 16, 16],   fg: [255, 255, 255], i: .32 },
    light: { bg: [255, 255, 255], fg: [22, 16, 16],   i: .34 },
  };
  const A0 = [247, 76, 46], A1 = [77, 97, 244]; // фирменный градиент #F74C2E → #4D61F4
  const GW = 72;                                  // сетка поля; GH — по пропорциям холста
  let GH = 40, fx, fy, nv;
  const LUT = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) LUT[i] = 1 - Math.exp(-i / 256 * 1.6);

  let W = 0, H = 0, img, buf, lum, acc, N = 0, px, py, ix, iy, heat, life;
  let theme = { bg: [...THEMES.dark.bg], fg: [...THEMES.dark.fg], i: 1 }, target = THEMES.dark;
  let t = 0, ox = 0, oy = 0, tox = 0, toy = 0, paused = false, running = false;
  const pointer = { x: 0, y: 0, on: false, vx: 0, vy: 0 };

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const res = r.width < 800 ? 1.25 : Math.min(.75, 1280 / r.width);
    const w = Math.max(160, Math.round(r.width * res)), h = Math.max(90, Math.round(r.height * res));
    if (w === W && h === H) return;
    W = canvas.width = w; H = canvas.height = h;
    GH = Math.round((GW - 1) * H / W) + 1;
    fx = new Float32Array(GW * GH); fy = new Float32Array(GW * GH); nv = new Float32Array(GW * GH);
    img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer);
    lum = new Float32Array(W * H); acc = new Float32Array(W * H);
    N = Math.round(W * H / 13);
    px = new Float32Array(N); py = new Float32Array(N); ix = new Float32Array(N); iy = new Float32Array(N);
    heat = new Float32Array(N); life = new Float32Array(N);
    for (let k = 0; k < N; k++) spawn(k, true);
    if (reduced) still();
  }
  function spawn(k, any) {
    px[k] = Math.random() * W; py[k] = Math.random() * H; ix[k] = iy[k] = heat[k] = 0;
    life[k] = 300 + Math.random() * (any ? 1200 : 900);
  }

  function computeField() {
    const sc = 1.7 / Math.min(GW, GH * 1.78); // ~2–3 крупных петли по ширине
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = i * sc + ox, y = j * sc + oy;
      nv[j * GW + i] = noise(x, y, t) + .45 * noise(x * 2.1 + 5.2, y * 2.1 + 1.3, t * 1.4);
    }
    const cell = W / (GW - 1), sp = Math.min(1.2, Math.max(.5, W / 1080));
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      const gx = (nv[j * GW + Math.min(GW - 1, i + 1)] - nv[j * GW + Math.max(0, i - 1)]) / 2;
      const gy = (nv[Math.min(GH - 1, j + 1) * GW + i] - nv[Math.max(0, j - 1) * GW + i]) / 2;
      const g = Math.hypot(gx, gy) + 1e-4, n = nv[k];
      const d = Math.max(-3, Math.min(3, n / g));          // расстояние до изолинии в клетках
      const pull = -d * .16 * cell, along = .12 + .88 * Math.exp(-d * d * .9);
      fx[k] = (gy / g) * along * 1.15 * sp + (gx / g) * pull;
      fy[k] = (-gx / g) * along * 1.15 * sp + (gy / g) * pull;
    }
  }

  function step() {
    t += .0016;
    ox += (tox - ox) * .025; oy += (toy - oy) * .025;
    for (let c = 0; c < 3; c++) { theme.bg[c] += (target.bg[c] - theme.bg[c]) * .07; theme.fg[c] += (target.fg[c] - theme.fg[c]) * .07; }
    theme.i += (target.i - theme.i) * .07;
    computeField();
    const sx = (GW - 1) / W, sy = (GH - 1) / H, R = W * .13, R2 = R * R;
    for (let k = 0; k < N; k++) {
      let x = px[k], y = py[k];
      const gx = x * sx, gy = y * sy, i0 = gx | 0, j0 = gy | 0, u = gx - i0, v = gy - j0;
      const a = j0 * GW + i0, b = a + 1, c = a + GW, d = c + 1;
      const vx = (fx[a] * (1 - u) + fx[b] * u) * (1 - v) + (fx[c] * (1 - u) + fx[d] * u) * v;
      const vy = (fy[a] * (1 - u) + fy[b] * u) * (1 - v) + (fy[c] * (1 - u) + fy[d] * u) * v;
      x += vx + ix[k] + (Math.random() - .5) * .7;
      y += vy + iy[k] + (Math.random() - .5) * .7;
      ix[k] *= .93; iy[k] *= .93; heat[k] *= .985;
      if (pointer.on) {
        const dx = x - pointer.x, dy = y - pointer.y, q = dx * dx + dy * dy;
        if (q < R2) {
          const dd = Math.sqrt(q) + .01, f = (1 - dd / R) ** 2;
          ix[k] += (-dy / dd * 1.1 + dx / dd * .35) * f + pointer.vx * f * .06;
          iy[k] += (dx / dd * 1.1 + dy / dd * .35) * f + pointer.vy * f * .06;
          if (f > heat[k]) heat[k] = f;
        }
      }
      if (--life[k] < 0 || x < 0 || y < 0 || x >= W - 1 || y >= H - 1) { spawn(k); continue; }
      px[k] = x; py[k] = y;
      const p = (y | 0) * W + (x | 0), h = heat[k];
      lum[p] += .5 * (1 - h); acc[p] += 1.2 * h;
    }
  }

  function draw() {
    const [br, bgc, bb] = theme.bg, [fr, fg, fb] = theme.fg, I = theme.i;
    const dr = (fr - br) * I, dg = (fg - bgc) * I, db = (fb - bb) * I;
    for (let y = 0, p = 0; y < H; y++) {
      const ty = y / H * .45;
      for (let x = 0; x < W; x++, p++) {
        const L = lum[p], A = acc[p];
        lum[p] = L * .58; acc[p] = A * .8;
        const l = LUT[L * 256 > 1023 ? 1023 : (L * 256) | 0];
        let r = br + dr * l, g = bgc + dg * l, b = bb + db * l;
        if (A > .004) {
          const a = LUT[A * 256 > 1023 ? 1023 : (A * 256) | 0], tt = x / W * .55 + ty;
          r += (A0[0] + (A1[0] - A0[0]) * tt - r) * a; g += (A0[1] + (A1[1] - A0[1]) * tt - g) * a; b += (A0[2] + (A1[2] - A0[2]) * tt - b) * a;
        }
        buf[p] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function still() { for (let s = 0; s < 260; s++) { step(); if (s > 200) draw(); } draw(); }
  function loop() {
    if (!paused && W) { step(); draw(); }
    pointer.vx *= .8; pointer.vy *= .8;
    requestAnimationFrame(loop);
  }

  function mount(host) {
    host.prepend(canvas);
    new ResizeObserver(resize).observe(canvas);
    resize();
    host.addEventListener('pointermove', e => { const [x, y] = toLocal(e); if (pointer.on) { pointer.vx = x - pointer.x; pointer.vy = y - pointer.y; } pointer.x = x; pointer.y = y; pointer.on = true; });
    host.addEventListener('pointerleave', () => { pointer.on = false; });
    host.addEventListener('pointerdown', e => { if (!e.target.closest('a,button,video,iframe,input,.qr-card')) pulse(...toLocal(e), 9); });
    if (!reduced && !running) { running = true; requestAnimationFrame(loop); }
  }
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  function pulse(x = W / 2, y = H / 2, s = 6) {
    const R = W * .35;
    for (let k = 0; k < N; k++) {
      const dx = px[k] - x, dy = py[k] - y, d = Math.hypot(dx, dy) + 1;
      if (d < R) { const f = (1 - d / R) * s; ix[k] += dx / d * f; iy[k] += dy / d * f; heat[k] = Math.max(heat[k], (1 - d / R) * .9); }
    }
  }
  let first = true;
  function mode(name, seed = 0) {
    target = THEMES[name] || THEMES.dark;
    tox = seed * 1.37; toy = seed * .61;
    if (first || (reduced && W)) { first = false; ox = tox; oy = toy; theme = { bg: [...target.bg], fg: [...target.fg], i: target.i }; if (reduced) still(); }
  }
  return { mount, mode, pulse, pulseAt: (clientX, clientY, s) => pulse(...toLocal({ clientX, clientY }), s), pause: v => { paused = v; } };
})();
