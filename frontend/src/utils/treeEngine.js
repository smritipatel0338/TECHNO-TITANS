export const cl = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const mix = (a, b, k) =>
  `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(',')})`;

export const ARCHETYPES = {
  banyan: {
    depth: 7,
    len: 44,
    wd: 15,
    spread: 0.62,
    m1: 0.9,
    m2: 0.9,
    r1: 0.76,
    r2: 0.76,
    lean: 0,
    lr: 1.15,
    leaf: [40, 150, 70],
    root: 1.2,
  },
  redwood: {
    depth: 8,
    len: 30,
    wd: 9,
    spread: 0.55,
    m1: 0.12,
    m2: 1,
    r1: 0.88,
    r2: 0.58,
    lean: 0,
    lr: 0.8,
    leaf: [30, 105, 85],
    root: 1.3,
  },
  bonsai: {
    depth: 6,
    len: 24,
    wd: 6,
    spread: 0.8,
    m1: 0.6,
    m2: 1.2,
    r1: 0.76,
    r2: 0.64,
    lean: 0.28,
    lr: 0.9,
    leaf: [110, 185, 95],
    root: 0.5,
  },
};

export const PRESETS = {
  exam: { sleep: 6, study: 7.5, screen: 2.5, movement: 30, spending: 450 },
  doom: { sleep: 4.5, study: 1, screen: 9.5, movement: 10, spending: 850 },
  bal: { sleep: 8, study: 4, screen: 2.5, movement: 60, spending: 350 },
};

export const TIPS = {
  sleep: 'Sleep is your weakest pillar. Move bedtime 45 minutes earlier.',
  study: 'Study depth is lagging. Even 45 focused minutes a day grows roots.',
  screen: 'Screen time is your biggest weed. Use the Reinvest slider to clear it.',
  movement: 'Movement is low. 25 brisk minutes feeds your leaves.',
  spending: 'Spending is leaking your pot. Delay impulse buys by 24 hours.',
};

export const BADGES = [
  ['sprout', '🌱 First Sprout'],
  ['roots', '🪴 Deep Roots'],
  ['ancient', '🌳 Ancient'],
  ['storm', '⛈️ Storm Survivor'],
  ['slayer', '🚫 Screen Slayer'],
  ['quest', '🎯 Quest Master'],
  ['friend', '💚 Friend of Tulsi'],
];

export const EVENTS = [
  { n: 'Exam storm ⛈️', t: 'needs 3h+ study', f: (v) => v.study >= 3, id: 'storm' },
  { n: 'Smog day 🌫️', t: 'needs 5h or less screen', f: (v) => v.screen <= 5 },
  { n: 'Heatwave ☀️', t: 'needs 7h+ sleep', f: (v) => v.sleep >= 7 },
  { n: 'Festival sale 🛍️', t: 'needs ₹500 or less spend', f: (v) => v.spending <= 500 },
  { n: 'Calm breeze 🍃', t: 'free pass', f: () => true },
];

export const QUEST_DEFS = [
  ['😴', 'Sleep 7h+', (v) => v.sleep / 7],
  ['📚', 'Study 3h+', (v) => v.study / 3],
  ['📵', 'Screen 5h or less', (v) => (v.screen <= 5 ? 1 : cl(1 - (v.screen - 5) / 7, 0, 0.95))],
  ['🏃', 'Move 45 min+', (v) => v.movement / 45],
  ['🪙', 'Spend ₹500 or less', (v) => (v.spending <= 500 ? 1 : cl(1 - (v.spending - 500) / 500, 0, 0.95))],
];

export function computeScores(v) {
  return {
    sleep: cl(1 - Math.abs(v.sleep - 8) / 4, 0, 1),
    study: cl(v.study / 4, 0, 1),
    screen: cl(1 - (v.screen - 3) / 7, 0, 1),
    movement: cl(v.movement / 60, 0, 1),
    spending: cl(1 - Math.max(0, v.spending - 500) / 500, 0, 1),
  };
}

export function hms(s) {
  return 0.25 * s.sleep + 0.25 * s.study + 0.2 * s.screen + 0.15 * s.movement + 0.15 * s.spending;
}

export function planBHabits(v, wi) {
  return {
    sleep: Math.min(10, v.sleep + (wi > 1 ? 0.5 : 0)),
    study: Math.min(8, v.study + wi * 0.8),
    screen: Math.max(1, v.screen - wi),
    movement: Math.min(120, v.movement + (wi > 0 ? 15 : 0)),
    spending: Math.max(0, v.spending - (wi > 1 ? 100 : 0)),
  };
}

export function healthAt(h, age) {
  return lerp(0.5, h, Math.pow(age, 0.8));
}

export function getStage(age, h) {
  if (age < 0.08) return 'Seed';
  if (age < 0.25) return 'Sprout';
  if (age < 0.5) return h < 0.3 ? 'Struggling sapling' : 'Sapling';
  if (h < 0.3) return 'Decaying';
  return age < 0.85 ? 'Full tree' : 'Ancient tree';
}

export function valIndex(h, t, k) {
  return cl(50 + (h - 0.5) * 100 * Math.pow(t, 1.3) * (1 + k * t), 4, 100);
}

function hr(id, k, s) {
  const v = Math.sin(id * 127.1 + k * 311.7 + (s || 0) * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function rgba(a, sh, al) {
  return `rgba(${a.map((z) => Math.round(cl(z * sh, 0, 255))).join(',')},${al})`;
}

function leafShape(c, x, y, a, s) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(s * 0.7, -s * 0.55, s * 1.7, 0);
  c.quadraticCurveTo(s * 0.7, s * 0.55, 0, 0);
  c.fill();
  c.restore();
}

export function drawTree(cv, h, age, arch, t) {
  if (!cv) return;
  const w = cv.clientWidth || 300;
  const H = 260;
  const d = window.devicePixelRatio || 1;
  const c = cv.getContext('2d');
  if (cv.width !== Math.round(w * d) || cv.height !== H * d) {
    cv.width = Math.round(w * d);
    cv.height = H * d;
  }
  c.setTransform(d, 0, 0, d, 0, 0);

  const g = 210;
  const x = w / 2;
  const P = ARCHETYPES[arch];
  const lf = cl((h - 0.25) / 0.6, 0, 1);
  const size = (0.1 + 0.9 * age) * (0.45 + 0.55 * h);

  // Sky
  const sk = c.createLinearGradient(0, 0, 0, g);
  sk.addColorStop(0, mix([105, 112, 130], [90, 170, 250], h));
  sk.addColorStop(1, mix([185, 180, 172], [255, 238, 200], h));
  c.fillStyle = sk;
  c.fillRect(0, 0, w, H);

  // Sun & Rays
  const sx = w - 52;
  const sy = 48;
  const sg = c.createRadialGradient(sx, sy, 4, sx, sy, 80);
  sg.addColorStop(0, `rgba(255,240,170,${0.15 + 0.85 * h})`);
  sg.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = sg;
  c.fillRect(0, 0, w, g);
  c.fillStyle = mix([205, 205, 210], [255, 226, 110], h);
  c.beginPath();
  c.arc(sx, sy, 15, 0, 7);
  c.fill();

  if (h > 0.6) {
    c.fillStyle = `rgba(255,245,190,${0.12 * (h - 0.5)})`;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx - 110 - i * 80, g);
      c.lineTo(sx - 50 - i * 80, g);
      c.fill();
    }
  }

  // Clouds
  c.fillStyle = mix([125, 130, 142], [255, 255, 255], h);
  c.globalAlpha = 0.7;
  for (let i = 0; i < 3; i++) {
    const cx = (((t / 70) * (1 + i * 0.4) + i * 150) % (w + 180)) - 90;
    const cy = 30 + i * 28;
    c.beginPath();
    c.ellipse(cx, cy, 34, 10, 0, 0, 7);
    c.ellipse(cx + 18, cy - 7, 20, 10, 0, 0, 7);
    c.ellipse(cx - 16, cy - 4, 18, 8, 0, 0, 7);
    c.fill();
  }
  c.globalAlpha = 1;

  // Hills
  for (let L = 0; L < 2; L++) {
    c.fillStyle = mix(
      L ? [96, 108, 84] : [130, 140, 120],
      L ? [62, 150, 84] : [120, 190, 140],
      h
    );
    c.beginPath();
    c.moveTo(0, H);
    for (let px = 0; px <= w + 10; px += 10) {
      c.lineTo(
        px,
        g - 34 + L * 16 - Math.sin(px / 70 + L * 2.3) * 14 - Math.sin(px / 31 + L) * 4
      );
    }
    c.lineTo(w, H);
    c.fill();
  }

  // Ground & Soil
  c.fillStyle = mix([105, 100, 66], [66, 165, 66], h);
  c.fillRect(0, g, w, 12);
  const sol = c.createLinearGradient(0, g + 10, 0, H);
  sol.addColorStop(0, '#7a4318');
  sol.addColorStop(1, '#33180a');
  c.fillStyle = sol;
  c.fillRect(0, g + 10, w, H - g);

  // Grass blades
  c.strokeStyle = mix([85, 90, 60], [40, 130, 50], h);
  c.lineWidth = 2;
  c.lineCap = 'round';
  for (let px = 4; px < w; px += 12) {
    const gh = 5 + 4 * hr(px, 1) * (0.4 + h);
    c.beginPath();
    c.moveTo(px, g + 2);
    c.lineTo(px + Math.sin(t / 600 + px) * 2, g - gh);
    c.stroke();
  }

  c.strokeStyle = 'rgba(43,24,16,.9)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, g + 11);
  c.lineTo(w, g + 11);
  c.stroke();

  c.fillStyle = 'rgba(0,0,0,.2)';
  c.beginPath();
  c.ellipse(x, g + 6, 18 + 80 * size, 5, 0, 0, 7);
  c.fill();

  // Underground Roots
  const rl = (18 + 60 * h) * (0.3 + 0.7 * age) * P.root;
  for (let i = -3; i <= 3; i++) {
    c.strokeStyle = `rgba(255,214,140,${0.35 + 0.4 * h})`;
    c.lineWidth = 3.2 - Math.abs(i) * 0.35;
    c.beginPath();
    c.moveTo(x, g + 11);
    c.quadraticCurveTo(
      x + i * rl * 0.3,
      g + 11 + rl * 0.45,
      x + i * rl * 0.5,
      g + 11 + rl * (0.7 + 0.1 * hr(i, 2))
    );
    c.stroke();
  }

  if (age < 0.06) {
    c.fillStyle = '#5c3a21';
    c.strokeStyle = '#2B1810';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, g + 26, 10, 13, 0.3, 0, 7);
    c.fill();
    c.stroke();
    c.strokeStyle = '#86efac';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, g + 14);
    c.lineTo(x + 1, g + 4);
    c.stroke();
    return;
  }

  let by = g;
  if (arch === 'bonsai') {
    by = g - 18;
    c.fillStyle = '#c2652b';
    c.strokeStyle = '#2B1810';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x - 40, g - 18);
    c.lineTo(x + 40, g - 18);
    c.lineTo(x + 30, g + 8);
    c.lineTo(x - 30, g + 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#d9824a';
    c.fillRect(x - 38, g - 18, 76, 6);
    c.fillStyle = mix([110, 100, 60], [60, 140, 70], h);
    c.beginPath();
    c.ellipse(x, g - 18, 34, 5, 0, 0, 7);
    c.fill();
  }

  const gd = size * (P.depth + 1) + 0.3;
  const ls = (0.3 + 0.7 * age) * (0.75 + 0.25 * h);
  const bark = mix([100, 86, 80], [84, 50, 26], h);
  const hi = mix([140, 125, 115], [150, 100, 60], h);
  const dry = [195, 125, 40];
  const lc = P.leaf.map((a, k) => dry[k] + (a - dry[k]) * lf);

  function leafy(ex, ey, id) {
    if (lf < 0.03) return;
    const rr = (10 + 7 * hr(id, 6)) * (0.5 + size) * P.lr;
    c.fillStyle = rgba(lc, 0.85, 0.3);
    c.beginPath();
    c.arc(ex, ey, rr, 0, 7);
    c.fill();
    const n = Math.round(2 + 4 * lf);
    const s = (4 + 3.5 * size) * P.lr;
    for (let j = 0; j < n; j++) {
      const a = hr(id, 7 + j) * 6.283 + Math.sin(t / 700 + id) * 0.25;
      const pk = arch === 'bonsai' && lf > 0.7 && hr(id, 20 + j) > 0.6;
      c.fillStyle = pk ? 'rgba(245,150,185,.95)' : rgba(lc, 0.75 + 0.5 * hr(id, 30 + j), 0.95);
      leafShape(c, ex + (hr(id, 40 + j) - 0.5) * rr, ey + (hr(id, 50 + j) - 0.5) * rr, a, s);
    }
  }

  function br(bx, by2, a, len, wd, dp, id) {
    const gr = cl(gd - dp, 0, 1);
    if (gr <= 0) return;
    const l = len * gr;
    const aa = a + Math.sin(t / 900 + dp * 0.7 + id * 0.3) * 0.022 * (dp + 1) * (0.4 + h);
    const ex = bx + Math.sin(aa) * l;
    const ey = by2 - Math.cos(aa) * l;
    const w2 = Math.max(1, wd * gr);

    c.strokeStyle = bark;
    c.lineWidth = w2;
    c.beginPath();
    c.moveTo(bx, by2);
    c.lineTo(ex, ey);
    c.stroke();

    if (w2 > 5) {
      c.strokeStyle = hi;
      c.lineWidth = w2 * 0.28;
      c.beginPath();
      c.moveTo(bx - w2 * 0.2, by2);
      c.lineTo(ex - w2 * 0.15, ey);
      c.stroke();
    }

    if (
      arch === 'banyan' &&
      (dp === 3 || dp === 4) &&
      size > 0.5 &&
      h > 0.3 &&
      hr(id, 9) > 0.55
    ) {
      c.strokeStyle = bark;
      c.lineWidth = 1.5 + size * 1.5;
      c.beginPath();
      c.moveTo(ex, ey);
      c.quadraticCurveTo(ex + (hr(id, 10) - 0.5) * 24, (ey + g) / 2, ex, ey + (g - ey) * gr);
      c.stroke();
    }

    if (dp >= P.depth - 1 || (dp >= 2 && hr(id, 5) > 0.6)) leafy(ex, ey, id);

    if (dp < P.depth) {
      const sp = P.spread * (0.7 + 0.6 * hr(id, 1));
      const da = (1 - h) * 0.22 * (aa > 0 ? 1 : -1);
      let s1 = sp * P.m1;
      let s2 = sp * P.m2;
      if (id % 2) {
        s1 = -s1;
        s2 = -s2;
      }
      br(ex, ey, aa + s1 + da, len * P.r1, wd * 0.72, dp + 1, id * 2);
      br(ex, ey, aa - s2 + da, len * P.r2, wd * 0.72, dp + 1, id * 2 + 1);
    }
  }

  br(x, by, P.lean, P.len * ls, P.wd * (0.4 + 0.6 * size), 0, 1);

  // Fireflies (healthy)
  if (h > 0.55 && age > 0.15) {
    for (let i = 0; i < 9; i++) {
      const fa = 0.5 + 0.5 * Math.sin(t / 500 + i * 1.9);
      const fx = x + Math.sin(t / 1300 + i * 2.1) * (40 + 70 * size);
      const fy = g - 30 - size * 90 + Math.cos(t / 900 + i * 1.7) * 22;
      c.fillStyle = `rgba(255,240,150,${fa * 0.25})`;
      c.beginPath();
      c.arc(fx, fy, 7, 0, 7);
      c.fill();
      c.fillStyle = `rgba(255,250,200,${fa})`;
      c.beginPath();
      c.arc(fx, fy, 2, 0, 7);
      c.fill();
    }
  }

  // Fallen leaves & mushrooms (unhealthy)
  if (h < 0.5 && age > 0.25) {
    c.fillStyle = '#b8741f';
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.ellipse(20 + hr(i, 3) * (w - 40), g + 2 + hr(i, 4) * 6, 5, 2.4, hr(i, 5) * 3, 0, 7);
      c.fill();
    }
  }
  if (h < 0.35 && age > 0.3) {
    [-34, -22, 30].forEach((o, k) => {
      const mx = x + o;
      const my = g + 1;
      c.fillStyle = '#f1e6c8';
      c.fillRect(mx - 2, my - 8, 4, 8);
      c.fillStyle = '#e0383e';
      c.beginPath();
      c.arc(mx, my - 8, 7 - k, Math.PI, 0);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(mx - 2, my - 11, 1.3, 0, 7);
      c.fill();
    });
  }

  // Rainstorm overlay
  if (h < 0.4) {
    c.fillStyle = `rgba(55,60,78,${(0.4 * (0.4 - h)) / 0.4})`;
    c.fillRect(0, 0, w, g);
    c.strokeStyle = 'rgba(150,165,190,.55)';
    c.lineWidth = 1.3;
    for (let i = 0; i < 30; i++) {
      const ry = (t / 3 + i * 41) % g;
      const rx = (i * 53 + ry * 0.3) % (w + 20);
      c.beginPath();
      c.moveTo(rx, ry);
      c.lineTo(rx - 3, ry + 10);
      c.stroke();
    }
  }
}