import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  LogOut,
  Search,
  Check,
  Plus,
  Mail,
  Lock,
  User,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { api, getToken } from './api';
import './style.css';

/* ============================================================================
   1. PROCEDURAL TREE ENGINE & MATH HELPERS
============================================================================ */
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (a, b, k) =>
  `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * k)).join(',')})`;

const ARCHETYPES = {
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

const PRESETS = {
  exam: { sleep: 6, study: 7.5, screen: 2.5, movement: 30, spending: 450 },
  doom: { sleep: 4.5, study: 1, screen: 9.5, movement: 10, spending: 850 },
  bal: { sleep: 8, study: 4, screen: 2.5, movement: 60, spending: 350 },
};

const TIPS = {
  sleep: 'Sleep is your weakest pillar. Move bedtime 45 minutes earlier.',
  study: 'Study depth is lagging. Even 45 focused minutes a day grows roots.',
  screen: 'Screen time is your biggest weed. Use the Reinvest slider to clear it.',
  movement: 'Movement is low. 25 brisk minutes feeds your leaves.',
  spending: 'Spending is leaking your pot. Delay impulse buys by 24 hours.',
};

const BADGES = [
  ['sprout', '🌱 First Sprout'],
  ['roots', '🪴 Deep Roots'],
  ['ancient', '🌳 Ancient'],
  ['storm', '⛈️ Storm Survivor'],
  ['slayer', '🚫 Screen Slayer'],
  ['quest', '🎯 Quest Master'],
  ['friend', '💚 Friend of Tulsi'],
];

const EVENTS = [
  { n: 'Exam storm ⛈️', t: 'needs 3h+ study', f: (v) => v.study >= 3, id: 'storm' },
  { n: 'Smog day 🌫️', t: 'needs 5h or less screen', f: (v) => v.screen <= 5 },
  { n: 'Heatwave ☀️', t: 'needs 7h+ sleep', f: (v) => v.sleep >= 7 },
  { n: 'Festival sale 🛍️', t: 'needs ₹500 or less spend', f: (v) => v.spending <= 500 },
  { n: 'Calm breeze 🍃', t: 'free pass', f: () => true },
];

const QUEST_DEFS = [
  ['😴', 'Sleep 7h+', (v) => v.sleep / 7],
  ['📚', 'Study 3h+', (v) => v.study / 3],
  ['📵', 'Screen 5h or less', (v) => (v.screen <= 5 ? 1 : cl(1 - (v.screen - 5) / 7, 0, 0.95))],
  ['🏃', 'Move 45 min+', (v) => v.movement / 45],
  ['🪙', 'Spend ₹500 or less', (v) => (v.spending <= 500 ? 1 : cl(1 - (v.spending - 500) / 500, 0, 0.95))],
];

function computeScores(v) {
  return {
    sleep: cl(1 - Math.abs(v.sleep - 8) / 4, 0, 1),
    study: cl(v.study / 4, 0, 1),
    screen: cl(1 - (v.screen - 3) / 7, 0, 1),
    movement: cl(v.movement / 60, 0, 1),
    spending: cl(1 - Math.max(0, v.spending - 500) / 500, 0, 1),
  };
}

function hms(s) {
  return 0.25 * s.sleep + 0.25 * s.study + 0.2 * s.screen + 0.15 * s.movement + 0.15 * s.spending;
}

function planBHabits(v, wi) {
  return {
    sleep: Math.min(10, v.sleep + (wi > 1 ? 0.5 : 0)),
    study: Math.min(8, v.study + wi * 0.8),
    screen: Math.max(1, v.screen - wi),
    movement: Math.min(120, v.movement + (wi > 0 ? 15 : 0)),
    spending: Math.max(0, v.spending - (wi > 1 ? 100 : 0)),
  };
}

function healthAt(h, age) {
  return lerp(0.5, h, Math.pow(age, 0.8));
}

function getStage(age, h) {
  if (age < 0.08) return 'Seed';
  if (age < 0.25) return 'Sprout';
  if (age < 0.5) return h < 0.3 ? 'Struggling sapling' : 'Sapling';
  if (h < 0.3) return 'Decaying';
  return age < 0.85 ? 'Full tree' : 'Ancient tree';
}

function valIndex(h, t, k) {
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

function drawTree(cv, h, age, arch, t) {
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
    const cx = ((t / 70) * (1 + i * 0.4) + i * 150) % (w + 180) - 90;
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
    c.fillStyle = mix(L ? [96, 108, 84] : [130, 140, 120], L ? [62, 150, 84] : [120, 190, 140], h);
    c.beginPath();
    c.moveTo(0, H);
    for (let px = 0; px <= w + 10; px += 10) {
      c.lineTo(px, g - 34 + L * 16 - Math.sin(px / 70 + L * 2.3) * 14 - Math.sin(px / 31 + L) * 4);
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

    if (arch === 'banyan' && (dp === 3 || dp === 4) && size > 0.5 && h > 0.3 && hr(id, 9) > 0.55) {
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

/* ============================================================================
   2. AMBIENT BUTTERFLY CANVAS COMPONENT
============================================================================ */
const PALETTE = [
  ['#ff8fb1', '#ffd1e0'],
  ['#6ec8ff', '#c5ecff'],
  ['#ffd23f', '#fff0a8'],
  ['#b48cff', '#e3d3ff'],
  ['#7ae582', '#d3f8d7'],
  ['#ff9a3c', '#ffd8ad'],
];

function ButterfliesCanvas({ hb }) {
  const canvasRef = useRef(null);
  const hbRef = useRef(hb);
  hbRef.current = hb;

  useEffect(() => {
    const bc = canvasRef.current;
    if (!bc) return;
    const bx = bc.getContext('2d');
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let BW = 0;
    let BH = 0;
    const BF = [];
    let rafId;

    const resize = () => {
      const d = Math.min(2, window.devicePixelRatio || 1);
      BW = window.innerWidth;
      BH = window.innerHeight;
      bc.width = BW * d;
      bc.height = BH * d;
      bx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const frame = (t) => {
      const want = rm ? 0 : Math.min(BW < 600 ? 6 : 10, 3 + Math.round(7 * hbRef.current));
      while (BF.length < want) {
        const i = BF.length;
        BF.push({
          x: Math.random() * BW,
          y: Math.random() * BH,
          a: Math.random() * 6.28,
          sp: 0.5 + Math.random() * 0.6,
          ph: Math.random() * 9,
          s: 8 + Math.random() * 7,
          c: PALETTE[i % PALETTE.length],
          tw: Math.random() * 50,
        });
      }
      BF.length = Math.min(BF.length, want);
      bx.clearRect(0, 0, BW, BH);

      BF.forEach((b) => {
        b.a += Math.sin(t / 1100 + b.tw) * 0.035 + (Math.random() - 0.5) * 0.05;
        b.x += Math.cos(b.a) * b.sp;
        b.y += Math.sin(b.a) * b.sp + Math.sin(t / 260 + b.ph) * 0.35;
        if (b.x < -30) b.x = BW + 30;
        if (b.x > BW + 30) b.x = -30;
        if (b.y < -30) b.y = BH + 30;
        if (b.y > BH + 30) b.y = -30;

        const f = 0.2 + 0.8 * Math.abs(Math.sin(t / (90 / b.sp) + b.ph));
        const s = b.s;
        bx.save();
        bx.translate(b.x, b.y);
        bx.rotate(b.a + Math.PI / 2);
        bx.strokeStyle = '#2B1810';
        bx.lineCap = 'round';
        bx.lineWidth = 1.6;
        for (let sd = -1; sd <= 1; sd += 2) {
          bx.save();
          bx.scale(sd * f, 1);
          bx.fillStyle = b.c[0];
          bx.beginPath();
          bx.ellipse(s * 0.6, -s * 0.3, s * 0.65, s * 0.9, 0.5, 0, 7);
          bx.fill();
          bx.stroke();
          bx.beginPath();
          bx.ellipse(s * 0.42, s * 0.6, s * 0.42, s * 0.55, -0.3, 0, 7);
          bx.fill();
          bx.stroke();
          bx.fillStyle = b.c[1];
          bx.beginPath();
          bx.arc(s * 0.65, -s * 0.4, s * 0.22, 0, 7);
          bx.fill();
          bx.restore();
        }
        bx.lineWidth = 2.4;
        bx.beginPath();
        bx.moveTo(0, -s * 0.7);
        bx.lineTo(0, s * 0.8);
        bx.stroke();
        bx.lineWidth = 1.2;
        bx.beginPath();
        bx.moveTo(0, -s * 0.7);
        bx.lineTo(-s * 0.3, -s * 1.1);
        bx.moveTo(0, -s * 0.7);
        bx.lineTo(s * 0.3, -s * 1.1);
        bx.stroke();
        bx.restore();
      });

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas id="bf" ref={canvasRef} aria-hidden="true" />;
}

/* ============================================================================
   3. DUAL TREE STAGE COMPONENT (Path A vs Path B + Time Scrubber)
============================================================================ */
function DualTreeStage({ ha, hb, arch, setArch, hz, setHz, age, setAge, play, setPlay }) {
  const cARef = useRef(null);
  const cBRef = useRef(null);
  const stateRef = useRef({ ha, hb, arch, age, play });
  stateRef.current = { ha, hb, arch, age, play };

  useEffect(() => {
    let rafId;
    const loop = (t) => {
      const st = stateRef.current;
      if (st.play) {
        setAge((prev) => {
          const nv = prev + 0.0025;
          if (nv >= 1) {
            setPlay(false);
            return 1;
          }
          return nv;
        });
      }
      if (cARef.current && cARef.current.offsetParent) {
        drawTree(cARef.current, healthAt(st.ha, st.age), st.age, st.arch, t);
        drawTree(cBRef.current, healthAt(st.hb, st.age), st.age, st.arch, t);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [setAge, setPlay]);

  const hA = healthAt(ha, age);
  const hB = healthAt(hb, age);
  const sA = getStage(age, hA);
  const sB = getStage(age, hB);
  const timeLabel =
    age === 0
      ? 'Today'
      : hz === '5y'
      ? `Year ${(age * 5).toFixed(1)}`
      : `Month ${(age * 6).toFixed(1)}`;

  return (
    <>
      <div className="row">
        <div className="seg">
          {[
            ['banyan', '🌳 Banyan'],
            ['redwood', '🌲 Redwood'],
            ['bonsai', '🌸 Bonsai'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${arch === id ? 'on' : ''}`}
              onClick={() => setArch(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="seg">
          {[
            ['6m', '6 mo'],
            ['5y', '5 yr'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${hz === id ? 'on' : ''}`}
              onClick={() => setHz(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panels">
        <div className="pan a">
          <div className="t">A: Current routine</div>
          <canvas className="tr" ref={cARef} />
          <div className="cap">
            <span className="pill">{sA}</span>
            health {Math.round(hA * 100)}%
          </div>
        </div>
        <div className="pan b">
          <div className="t">B: Reinvested routine</div>
          <canvas className="tr" ref={cBRef} />
          <div className="cap">
            <span className="pill">{sB}</span>
            health {Math.round(hB * 100)}%
          </div>
        </div>
      </div>

      <div className="scrub">
        <b>{timeLabel}</b>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(age * 100)}
          aria-label="Time travel"
          onChange={(e) => {
            setPlay(false);
            setAge(Number(e.target.value) / 100);
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (play) {
              setPlay(false);
            } else {
              if (age >= 1) setAge(0);
              setPlay(true);
            }
          }}
        >
          {play ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </>
  );
}

/* ============================================================================
   4. INTERACTIVE SVG TULSI MASCOT COMPONENT
============================================================================ */
function TulsiMascot({ bubble, bubbleOn, onPoke }) {
  const [popped, setPopped] = useState(false);
  const [hearts, setHearts] = useState([]);

  const triggerPoke = () => {
    setPopped(false);
    requestAnimationFrame(() => setPopped(true));
    const batch = Array.from({ length: 5 }, (_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      emoji: ['💚', '💖', '✨'][i % 3],
      dx: `${Math.random() * 80 - 40}px`,
      left: `${25 + Math.random() * 50}%`,
    }));
    setHearts((prev) => [...prev, ...batch]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !batch.some((b) => b.id === h.id)));
    }, 1200);
    onPoke();
  };

  return (
    <div
      id="mascot"
      className={popped ? 'pop' : ''}
      role="button"
      tabIndex={0}
      aria-label="Poke Tulsi for a favour"
      onClick={triggerPoke}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerPoke();
        }
      }}
    >
      <div id="bubble" className={bubbleOn ? 'show' : ''} aria-live="polite">
        {bubble}
      </div>
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart"
          style={{ '--dx': h.dx, left: h.left }}
        >
          {h.emoji}
        </span>
      ))}
      <svg viewBox="0 0 120 150" aria-hidden="true">
        <g stroke="#2B1810" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <path d="M34 100h52l9 40H25z" fill="#58cc02" />
          <path d="M48 100q12 12 24 0" fill="#fff" />
          <rect x="38" y="138" width="16" height="8" rx="4" fill="#2B1810" />
          <rect x="66" y="138" width="16" height="8" rx="4" fill="#2B1810" />
          <path d="M33 106q-14 4-14 22" fill="none" strokeWidth="12" />
          <path d="M33 106q-14 4-14 22" fill="none" stroke="#ffd9b8" strokeWidth="6" />
          <g className="arm">
            <path d="M87 106q16 0 18-20" fill="none" strokeWidth="12" />
            <path d="M87 106q16 0 18-20" fill="none" stroke="#ffd9b8" strokeWidth="6" />
          </g>
          <ellipse cx="60" cy="58" rx="38" ry="40" fill="#3b2314" />
          <circle cx="25" cy="30" r="13" fill="#3b2314" />
          <circle cx="95" cy="30" r="13" fill="#3b2314" />
          <circle cx="60" cy="66" r="32" fill="#ffd9b8" />
          <path d="M28 62q2-36 32-36t32 36q-12-18-32-18T28 62z" fill="#3b2314" />
          <path
            d="M60 28q-12-14-26-8q10 14 26 8zM60 28q12-14 26-8q-10 14-26 8z"
            fill="#58cc02"
          />
        </g>
        <g className="eye">
          <ellipse cx="47" cy="68" rx="5.5" ry="7.5" fill="#2B1810" />
          <circle cx="45" cy="65" r="2.2" fill="#fff" />
        </g>
        <g className="eye">
          <ellipse cx="73" cy="68" rx="5.5" ry="7.5" fill="#2B1810" />
          <circle cx="71" cy="65" r="2.2" fill="#fff" />
        </g>
        <ellipse cx="36" cy="78" rx="6" ry="3.5" fill="#ff8fb1" opacity=".7" />
        <ellipse cx="84" cy="78" rx="6" ry="3.5" fill="#ff8fb1" opacity=".7" />
        <path
          className="m1"
          d="M52 80q8 8 16 0"
          fill="none"
          stroke="#2B1810"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse
          className="m2"
          cx="60"
          cy="82"
          rx="6"
          ry="5"
          fill="#e0383e"
          stroke="#2B1810"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}

/* ============================================================================
   5. AUTH SCREEN (Comic-Framed Split View)
============================================================================ */
function AuthScreen({ mode, setMode, form, setForm, onSubmit, error, busy }) {
  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="logo">
          Future<span>You</span> 🌱
        </div>
        <div className="auth-hero">
          <div className="hero-sun" />
          <div className="hero-tree">🌳</div>
          <div className="hero-copy">
            <span className="eyebrow">YOUR HABITS. YOUR STORY.</span>
            <h1>
              Grow into the
              <br />
              <em>future you</em>
              <br />
              dream of.
            </h1>
            <p>Every little choice plants a seed. See where your habits could take you.</p>
          </div>
        </div>
        <div className="auth-foot">✦ A tiny step today is a big branch tomorrow.</div>
      </div>

      <div className="auth-right">
        <form className="card auth-card" onSubmit={onSubmit}>
          <div className="hd" style={{ '--c': 'var(--green)' }}>
            {mode === 'login' ? '🌼 Welcome Back' : '🌱 Plant Your First Seed'}
          </div>
          <div className="bd">
            <p className="f" style={{ marginBottom: 14 }}>
              {mode === 'login'
                ? 'Your living tree twin missed you.'
                : 'Create an account to save your habits and grow with friends.'}
            </p>
            {mode === 'register' && (
              <>
                <label className="auth-lbl">Your name</label>
                <div className="input-wrap">
                  <User size={17} />
                  <input
                    required
                    placeholder="Smriti Patel"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <label className="auth-lbl">Username</label>
                <div className="input-wrap">
                  <span style={{ fontWeight: 900 }}>@</span>
                  <input
                    required
                    minLength="3"
                    placeholder="yourname"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
              </>
            )}
            <label className="auth-lbl">Email address</label>
            <div className="input-wrap">
              <Mail size={17} />
              <input
                required
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <label className="auth-lbl">Password</label>
            <div className="input-wrap">
              <Lock size={17} />
              <input
                required
                minLength="8"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="btn green big" style={{ marginTop: 18 }} disabled={busy}>
              {busy
                ? 'Growing your account…'
                : mode === 'login'
                ? 'Enter my garden ▶'
                : 'Create my account ▶'}
            </button>

            <p className="switch-auth">
              {mode === 'login' ? 'New to Future You?' : 'Already growing here?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Create account' : 'Log in'}
              </button>
            </p>
            <p className="f" style={{ fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              Your habit data is private. Friends only see progress you choose to share.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   6. MAIN APPLICATION
============================================================================ */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};
const defaultHabits = { sleep: 6, study: 2, screen: 7, movement: 30, spending: 600 };

function App() {
  // Auth & Navigation
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fy_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(getToken());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // Mobile Tab & Dark Mode
  const [tab, setTab] = useState('garden');
  const [dark, setDark] = useState(() =>
    window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );

  // Habits & Tree Twin State
  const [habits, setHabits] = useState(defaultHabits);
  const [reinvest, setReinvest] = useState(1);
  const [arch, setArch] = useState('banyan');
  const [hz, setHz] = useState('6m');
  const [age, setAge] = useState(0);
  const [play, setPlay] = useState(false);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  // AI Simulation State
  const [simulation, setSimulation] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);

  // Gamification & Tulsi State (Persisted in localStorage per user)
  const gameKey = user ? `fy_game_${user.id || user._id || user.email}` : 'fy_game_guest';
  const [game, setGame] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(gameKey));
      if (saved) return saved;
    } catch {}
    return {
      day: 0,
      lastLoggedDate: '',
      streak: 0,
      best: 0,
      xp: 0,
      gems: 10,
      hearts: 5,
      shield: 0,
      boost: 0,
      pokes: 0,
      badges: {},
      log: [],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(gameKey, JSON.stringify(game));
    } catch {}
  }, [game, gameKey]);

  const coolRef = useRef(0);
  const [bubble, setBubble] = useState("Hi! I'm Tulsi 🌿 Poke me for a favour!");
  const [bubbleOn, setBubbleOn] = useState(false);
  const bubbleTimer = useRef(null);

  const say = useCallback((msg, ms = 5500) => {
    setBubble(msg);
    setBubbleOn(true);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubbleOn(false), ms);
  }, []);

  useEffect(() => {
    if (token && user) {
      const t = setTimeout(() => say("Hi! I'm Tulsi 🌿 Poke me for a favour!", 6000), 1200);
      return () => clearTimeout(t);
    }
  }, [token, user, say]);

  // Toast & End-of-Day Modal
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);
  const notify = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2500);
  }, []);

  const [modalData, setModalData] = useState(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setModalData(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Friends State
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendProgress, setFriendProgress] = useState(null);

  // Theme sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Load Backend Summary & Friends
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [h, f] = await Promise.all([api('/habits/summary'), api('/friends')]);
        setHistory(h.history || []);
        if (h.averages && h.count) {
          setHabits((prev) => ({
            ...prev,
            sleep: Number(h.averages.sleep ?? prev.sleep),
            study: Number(h.averages.study ?? prev.study),
            screen: Number(h.averages.screen ?? prev.screen),
            movement: Number(h.averages.movement ?? prev.movement),
            spending: Number(h.averages.spending ?? prev.spending),
          }));
        }
        setFriends(f.friends || []);
        setRequests(f.requests || []);

        // Calculate consecutive tracked days from backend history
        const n = [...(h.history || [])].sort((a, b) => b.date.localeCompare(a.date));
        let run = 0;
        let cursor = new Date(today() + 'T00:00:00');
        for (const item of n) {
          const d = new Date(item.date + 'T00:00:00');
          const diff = Math.round((cursor - d) / 86400000);
          if (diff === 0 || diff === 1) {
            run++;
            cursor = d;
          } else if (diff > 1) break;
        }
        if (run > 0) {
          setGame((g) => ({
            ...g,
            streak: Math.max(g.streak, run),
            best: Math.max(g.best, run),
          }));
        }
      } catch (e) {
        notify(e.message);
      }
    })();
  }, [token, notify]);

  // Derived Scores & Projections
  const sa = useMemo(() => computeScores(habits), [habits]);
  const ha = useMemo(() => hms(sa), [sa]);
  const hb = useMemo(() => hms(computeScores(planBHabits(habits, reinvest))), [habits, reinvest]);
  const scorePct = Math.round(ha * 100);

  const lowestPillar = useMemo(() => {
    let low = 'sleep';
    Object.keys(sa).forEach((q) => {
      if (sa[q] < sa[low]) low = q;
    });
    return low;
  }, [sa]);

  const questProgress = useMemo(
    () =>
      QUEST_DEFS.map(([icon, label, fn]) => {
        const p = cl(fn(habits), 0, 1);
        return { icon, label, pct: Math.round(p * 100), done: p >= 1 };
      }),
    [habits]
  );
  const questsDoneCount = questProgress.filter((q) => q.done).length;

  const kFactor = hz === '5y' ? 1 : 0.5;
  const horizonName = hz === '5y' ? 'five years' : 'six months';
  const vaEnd = Math.round(valIndex(ha, 1, kFactor));
  const vbEnd = Math.round(valIndex(hb, 1, kFactor));
  const gapVal = vbEnd - vaEnd;
  const gapStr = `${gapVal >= 0 ? '+' : ''}${gapVal}`;

  // Auth Actions
  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('fy_token', data.token);
      localStorage.setItem('fy_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('fy_token');
    localStorage.removeItem('fy_user');
    setToken(null);
    setUser(null);
    setSimulation(null);
  }

  // Save Habits & End the Day (Combined DB Persistence + Gamified Event)
  async function handleEndDay() {
    setSaving(true);
    try {
      const saved = await api('/habits', {
        method: 'POST',
        body: JSON.stringify({ ...habits, date: today() }),
      });
      setHistory((old) =>
        [saved.habit, ...old.filter((x) => x.date !== today())].sort((a, b) =>
          b.date.localeCompare(a.date)
        )
      );
    } catch (err) {
      notify(`Sync warning: ${err.message}`);
    } finally {
      setSaving(false);
    }

    const effectiveScore = Math.min(100, scorePct + (game.boost ? 10 : 0));
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const ok = effectiveScore >= 60;
    const pass = ev.f(habits);
    const alreadyLoggedToday = game.lastLoggedDate === today();
    const lv0 = Math.floor(game.xp / 100);

    let xp = Math.round(effectiveScore / 4) + questsDoneCount * 4 + (ok && pass ? 10 : 0);
    let gems = questsDoneCount + (ok && pass ? 3 : 0);
    let title = '';
    let msg = '';
    let col = '';
    let nextStreak = game.streak;
    let nextBest = game.best;
    let nextHearts = game.hearts;
    let nextShield = game.shield;
    const nextBadges = { ...game.badges };

    const grantBadge = (id) => {
      if (!nextBadges[id]) {
        nextBadges[id] = 1;
        const found = BADGES.find((b) => b[0] === id);
        if (found) notify(`Badge unlocked: ${found[1]}`);
      }
    };

    if (ok) {
      if (!alreadyLoggedToday) {
        nextStreak += 1;
        nextBest = Math.max(nextBest, nextStreak);
      }
      grantBadge('sprout');
      if (nextStreak >= 3) grantBadge('roots');
      if (nextStreak >= 7) grantBadge('ancient');
      if (ev.id === 'storm' && pass) grantBadge('storm');
      if (habits.screen <= 3) grantBadge('slayer');
      if (!alreadyLoggedToday && nextHearts < 5 && nextStreak % 3 === 0) nextHearts += 1;

      title = alreadyLoggedToday ? 'Today updated!' : 'Day complete!';
      col = 'var(--green)';
      msg = pass
        ? `${ev.n} (${ev.t}): bonus cleared & saved! Streak: ${nextStreak} day(s).`
        : `${ev.n} (${ev.t}) was tough, but your ${effectiveScore} score kept your ${nextStreak}-day streak alive!`;
    } else if (nextShield > 0) {
      nextShield -= 1;
      xp = Math.round(xp / 2);
      title = 'Shield saved you!';
      col = 'var(--orange)';
      msg = `Score ${effectiveScore} was under 60, but your Streak Shield held.`;
    } else {
      nextStreak = 0;
      nextHearts -= 1;
      xp = Math.round(xp / 2);
      gems = 0;
      title = 'Wilted day';
      col = 'var(--red)';
      msg = `Score ${effectiveScore} was under 60. Streak reset, -1 heart.`;
      if (nextHearts <= 0) {
        nextHearts = 3;
        msg += ' Fresh start with 3 hearts.';
      }
    }

    if (questsDoneCount === 5) grantBadge('quest');

    const nextXp = game.xp + xp;
    const nextGems = game.gems + gems;
    const nextDay = game.day + 1;

    if (Math.floor(nextXp / 100) > lv0) {
      notify(`Level up! Lv ${Math.floor(nextXp / 100) + 1} 🎉`);
    }

    setGame({
      ...game,
      day: nextDay,
      lastLoggedDate: ok ? today() : game.lastLoggedDate,
      streak: nextStreak,
      best: nextBest,
      xp: nextXp,
      gems: nextGems,
      hearts: nextHearts,
      shield: nextShield,
      boost: 0,
      badges: nextBadges,
      log: [`Day ${nextDay}: ${title} (score ${effectiveScore})`, ...game.log].slice(0, 4),
    });

    setModalData({
      title,
      col,
      stats: [
        ['Score', effectiveScore],
        ['XP', `+${xp}`],
        ['Gems', `+${gems}`],
        ['Streak', `🔥${nextStreak}`],
      ],
      msg,
    });
  }

  // Tulsi Poke Favour
  function handlePokeTulsi() {
    const nextPokes = game.pokes + 1;
    const nextBadges = { ...game.badges };
    if (nextPokes >= 5 && !nextBadges.friend) {
      nextBadges.friend = 1;
      notify('Badge unlocked: 💚 Friend of Tulsi');
    }

    const now = Date.now();
    if (now < coolRef.current) {
      setGame((g) => ({ ...g, pokes: nextPokes, badges: nextBadges }));
      say(
        `Hehe, give me ${Math.ceil((coolRef.current - now) / 1000)}s to find another favour! 🌸`,
        2500
      );
      return;
    }
    coolRef.current = now + 7000;

    const r = Math.random();
    if (r < 0.3) {
      const n = 5 + Math.floor(Math.random() * 11);
      setGame((g) => ({ ...g, pokes: nextPokes, gems: g.gems + n, badges: nextBadges }));
      say(`Favour: ${n} gems from my secret stash! 💎`);
    } else if (r < 0.5 && game.shield < 2) {
      setGame((g) => ({ ...g, pokes: nextPokes, shield: g.shield + 1, badges: nextBadges }));
      say('Favour: a Streak Shield! It saves you from one bad day. 🛡️');
    } else if (r < 0.7) {
      setGame((g) => ({ ...g, pokes: nextPokes, boost: 1, badges: nextBadges }));
      say("Favour: Sunshine Boost! Tonight's score gets +10. ☀️");
    } else {
      setGame((g) => ({ ...g, pokes: nextPokes, badges: nextBadges }));
      say(`Favour: tip time! ${TIPS[lowestPillar || 'sleep']}`);
    }
  }

  // Run AI Engine Simulation
  async function runAiSimulation() {
    setAiBusy(true);
    try {
      const data = await api('/simulations', {
        method: 'POST',
        body: JSON.stringify({
          user: { ...habits, name: user?.name || 'friend' },
          history,
          reinvest,
        }),
      });
      setSimulation(data);
      setTab('insights');
      notify('AI letter & projections synced! ✨');
    } catch (err) {
      notify(err.message);
    } finally {
      setAiBusy(false);
    }
  }

  // Friends Actions
  async function searchFriends() {
    if (query.trim().length < 2) return;
    try {
      const d = await api(`/friends/search?q=${encodeURIComponent(query)}`);
      setSearchResults(d.users || []);
    } catch (err) {
      notify(err.message);
    }
  }

  async function sendRequest(id) {
    try {
      await api(`/friends/request/${id}`, { method: 'POST' });
      notify('Friend request sent!');
      setSearchResults((r) => r.filter((x) => x._id !== id));
    } catch (err) {
      notify(err.message);
    }
  }

  async function answerRequest(id, action) {
    try {
      await api(`/friends/request/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const d = await api('/friends');
      setFriends(d.friends || []);
      setRequests(d.requests || []);
      notify(action === 'accept' ? 'New friend added!' : 'Request declined.');
    } catch (err) {
      notify(err.message);
    }
  }

  async function viewFriend(id) {
    try {
      const d = await api(`/friends/${id}/progress`);
      setFriendProgress(d);
    } catch (err) {
      notify(err.message);
    }
  }

  if (!token || !user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        onSubmit={submitAuth}
        error={authError}
        busy={busy}
      />
    );
  }

  const level = Math.floor(game.xp / 100) + 1;
  const xpMod = game.xp % 100;

  // Chart Data for Insights (Uses live AI simulation if available, else procedural curve)
  const simHorizonKey = hz === '5y' ? 'fiveYears' : 'sixMonths';
  const simSeries = simulation?.[simHorizonKey];
  const chartPoints = useMemo(() => {
    if (simSeries?.current && simSeries?.improved) {
      return simSeries.current.map((pt, idx) => ({
        label: hz === '5y' ? `${(pt.month / 12).toFixed(1)}y` : `${pt.month}m`,
        current: pt.index,
        improved: simSeries.improved[idx]?.index ?? pt.index,
      }));
    }
    return Array.from({ length: 13 }, (_, j) => {
      const t = j / 12;
      return {
        label: t === 0 ? 'Today' : hz === '5y' ? `${(t * 5).toFixed(1)}y` : `${(t * 6).toFixed(0)}m`,
        current: Math.round(valIndex(ha, t, kFactor)),
        improved: Math.round(valIndex(hb, t, kFactor)),
      };
    });
  }, [simSeries, hz, ha, hb, kFactor]);

  const historyChart = useMemo(
    () =>
      [...history].reverse().slice(-14).map((h) => ({
        date: h.date.slice(5),
        study: h.study,
        sleep: h.sleep,
      })),
    [history]
  );

  return (
    <>
      <ButterfliesCanvas hb={hb} />

      {/* STICKY COMIC TOP BAR */}
      <header className="top">
        <div className="top-in">
          <div className="logo">
            Future<span>You</span> 🌱
          </div>
          <span className="chip" title="Day streak">
            🔥 <b>{game.streak}</b>
          </span>
          <span className="chip" title="Gems">
            💎 <b>{game.gems}</b>
          </span>
          <span className="chip" title="Hearts">
            ❤️ <b>{game.hearts}</b>
          </span>
          <button
            type="button"
            className="btn"
            style={{ padding: '3px 10px', boxShadow: '0 3px 0 var(--line)' }}
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
          >
            🌓
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 10px', boxShadow: '0 3px 0 var(--line)' }}
            aria-label="Log out"
            title={`Logged in as ${user.name}`}
            onClick={logout}
          >
            <LogOut size={15} />
          </button>
          <div className="xp">
            <b>Lv {level}</b>
            <div className="bar">
              <i style={{ width: `${xpMod}%` }} />
            </div>
            <span className="f">{xpMod}/100</span>
          </div>
        </div>
      </header>

      {/* MAIN 2-COLUMN DASHBOARD */}
      <main className="app">
        <div className="grid">
          {/* LEFT STICKY COLUMN: LIVING TREE GARDEN */}
          <div className="col">
            <section
              className={`card panel ${tab === 'garden' ? 'on' : ''}`}
              style={{ '--c': 'var(--green)' }}
            >
              <div className="hd">
                🌳 Garden <span className="sp">Plan B {gapStr}</span>
              </div>
              <div className="bd">
                <DualTreeStage
                  ha={ha}
                  hb={hb}
                  arch={arch}
                  setArch={setArch}
                  hz={hz}
                  setHz={setHz}
                  age={age}
                  setAge={setAge}
                  play={play}
                  setPlay={setPlay}
                />
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: HABITS, QUESTS, INSIGHTS, FRIENDS */}
          <div className="col">
            {/* HABITS SLIDERS CARD */}
            <section
              className={`card panel ${tab === 'habits' ? 'on' : ''}`}
              style={{ '--c': 'var(--blue)' }}
            >
              <div className="hd">
                🎚️ Habits <span className="sp">{history.length} days saved</span>
              </div>
              <div className="bd">
                <div className="top2">
                  <div
                    className="ring"
                    style={{
                      '--p': scorePct,
                      '--rc':
                        scorePct < 40
                          ? 'var(--red)'
                          : scorePct < 60
                          ? 'var(--orange)'
                          : 'var(--green)',
                    }}
                  >
                    <i>{scorePct}</i>
                  </div>
                  <div>
                    <b>Habit score</b>
                    <div className="f">60+ keeps your streak alive.</div>
                    <div className="f">
                      A: {getStage(age, healthAt(ha, age))} · B: {getStage(age, healthAt(hb, age))}
                    </div>
                  </div>
                </div>

                <div className="sl">
                  <label htmlFor="sleep">😴 Sleep</label>
                  <input
                    id="sleep"
                    type="range"
                    min="3"
                    max="10"
                    step="0.5"
                    value={habits.sleep}
                    onChange={(e) => setHabits({ ...habits, sleep: parseFloat(e.target.value) })}
                  />
                  <output>{habits.sleep} h</output>
                </div>

                <div className="sl">
                  <label htmlFor="study">📚 Study</label>
                  <input
                    id="study"
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    value={habits.study}
                    onChange={(e) => setHabits({ ...habits, study: parseFloat(e.target.value) })}
                  />
                  <output>{habits.study} h</output>
                </div>

                <div className="sl">
                  <label htmlFor="screen">📱 Screen</label>
                  <input
                    id="screen"
                    type="range"
                    min="1"
                    max="12"
                    step="0.5"
                    value={habits.screen}
                    onChange={(e) => setHabits({ ...habits, screen: parseFloat(e.target.value) })}
                  />
                  <output>{habits.screen} h</output>
                </div>

                <div className="sl">
                  <label htmlFor="act">🏃 Movement</label>
                  <input
                    id="act"
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={habits.movement}
                    onChange={(e) =>
                      setHabits({ ...habits, movement: parseFloat(e.target.value) })
                    }
                  />
                  <output>{habits.movement} min</output>
                </div>

                <div className="sl">
                  <label htmlFor="spend">🪙 Spending</label>
                  <input
                    id="spend"
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={habits.spending}
                    onChange={(e) =>
                      setHabits({ ...habits, spending: parseFloat(e.target.value) })
                    }
                  />
                  <output>₹{habits.spending}</output>
                </div>

                <div className="sl" style={{ borderTop: '3px dashed var(--line)', paddingTop: 14 }}>
                  <label htmlFor="wi">⚡ Reinvest (B)</label>
                  <input
                    id="wi"
                    type="range"
                    min="0"
                    max="4"
                    step="0.5"
                    value={reinvest}
                    onChange={(e) => setReinvest(parseFloat(e.target.value))}
                  />
                  <output>−{reinvest} h</output>
                </div>

                <div className="seg">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setHabits(PRESETS.exam)}
                  >
                    📚 Exam
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setHabits(PRESETS.doom)}
                  >
                    🎮 Doomscroll
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setHabits(PRESETS.bal)}
                  >
                    ⚖️ Balanced
                  </button>
                </div>
              </div>
            </section>

            {/* DAILY QUESTS & GAMIFICATION CARD */}
            <section
              className={`card panel ${tab === 'quests' ? 'on' : ''}`}
              style={{ '--c': 'var(--orange)' }}
            >
              <div className="hd">
                🎯 Daily Quests <span className="sp">{questsDoneCount}/5</span>
              </div>
              <div className="bd">
                <div>
                  {questProgress.map((q) => (
                    <div key={q.label} className={`q ${q.done ? 'done' : ''}`}>
                      <span className="qi">{q.done ? '✅' : q.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="qt">{q.label}</div>
                        <div className="bar">
                          <i style={{ width: `${q.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="f" style={{ margin: '10px 0' }}>
                  🛡️ Shield ×{game.shield} &nbsp; ☀️ Boost:{' '}
                  {game.boost ? 'ready (+10 tonight)' : 'none'} &nbsp; 🏆 Best streak {game.best}
                </p>

                <button
                  type="button"
                  className="btn green big"
                  disabled={saving}
                  onClick={handleEndDay}
                >
                  {saving ? 'Planting today…' : 'Save & End the day ▶'}
                </button>

                <p className="f" style={{ marginTop: 8 }}>
                  Saves today to your garden. Score 60+ grows your streak; clearing the daily
                  event earns bonus XP &amp; gems!
                </p>

                <div style={{ marginTop: 10 }}>
                  {BADGES.map(([id, label]) => (
                    <span key={id} className={`badge ${game.badges[id] ? 'got' : ''}`}>
                      {label}
                    </span>
                  ))}
                </div>

                {game.log.length > 0 && (
                  <div className="log" style={{ marginTop: 8 }}>
                    {game.log.map((l, idx) => (
                      <p key={idx}>{l}</p>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* INSIGHTS & AI FUTURE LETTER CARD */}
            <section
              className={`card panel ${tab === 'insights' ? 'on' : ''}`}
              style={{ '--c': 'var(--purple)' }}
            >
              <div className="hd">
                📊 Insights
                <button
                  type="button"
                  className="btn"
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 10px',
                    fontSize: 11,
                    color: '#1b1f3b',
                  }}
                  disabled={aiBusy}
                  onClick={runAiSimulation}
                >
                  <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {aiBusy ? 'Thinking…' : 'AI Simulate'}
                </button>
              </div>
              <div className="bd">
                <div className="gapbox">
                  <div>
                    <div className="big">
                      {simSeries
                        ? `${simSeries.gap >= 0 ? '+' : ''}${simSeries.gap}`
                        : gapStr}
                    </div>
                  </div>
                  <div className="f" style={{ flex: 1, minWidth: 150 }}>
                    {reinvest === 0
                      ? 'Move the Reinvest slider to see what extra focus time is worth.'
                      : `Index points Plan B gains over your routine after ${horizonName}.`}
                  </div>
                </div>

                <div style={{ width: '100%', height: 185 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartPoints}>
                      <CartesianGrid strokeDasharray="4 4" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fill: 'var(--soft)', fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--soft)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '3px solid var(--line)',
                          background: 'var(--card)',
                          color: 'var(--ink)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="improved"
                        name="Path B (Reinvested)"
                        stroke="#1fa89b"
                        strokeWidth={3}
                        fill="#1fa89b"
                        fillOpacity={0.2}
                      />
                      <Area
                        type="monotone"
                        dataKey="current"
                        name="Path A (Current)"
                        stroke="#ff4b4b"
                        strokeWidth={3}
                        fill="#ff4b4b"
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {historyChart.length >= 2 && (
                  <div style={{ marginTop: 14 }}>
                    <h3
                      style={{
                        margin: '6px 0',
                        font: '400 20px Bangers',
                        letterSpacing: '.04em',
                      }}
                    >
                      📈 Logged History ({history.length} days)
                    </h3>
                    <div style={{ width: '100%', height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyChart}>
                          <XAxis dataKey="date" tick={{ fill: 'var(--soft)', fontSize: 10 }} />
                          <YAxis tick={{ fill: 'var(--soft)', fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 10,
                              border: '2px solid var(--line)',
                              background: 'var(--card)',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="study"
                            name="Study (h)"
                            stroke="#1cb0f6"
                            strokeWidth={2.5}
                          />
                          <Line
                            type="monotone"
                            dataKey="sleep"
                            name="Sleep (h)"
                            stroke="#a560e8"
                            strokeWidth={2.5}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <h3
                  style={{
                    margin: '14px 0 4px',
                    font: '400 20px Bangers',
                    letterSpacing: '.04em',
                  }}
                >
                  🌿 Biggest weed
                </h3>
                <div>
                  <b>Lowest pillar: {lowestPillar}.</b> {TIPS[lowestPillar]}
                </div>

                <h3
                  style={{
                    margin: '14px 0 4px',
                    font: '400 20px Bangers',
                    letterSpacing: '.04em',
                  }}
                >
                  💌 Letter from your future tree
                </h3>
                <p style={{ whiteSpace: 'pre-line' }}>
                  {simulation?.letter
                    ? simulation.letter
                    : `Dear ${user.name.split(' ')[0]},\n\nI am writing from ${horizonName} ahead. On your current routine I stand at ${vaEnd}/100. If you reinvest ${reinvest} h of screen time I reach ${vbEnd}/100.\n\nYou cannot shout a plant into growing. Fix the ${lowestPillar} tonight.\n\nYours, future ${arch}`}
                </p>
                {simulation?.disclaimer && (
                  <p className="f" style={{ fontSize: 11, marginTop: 8 }}>
                    {simulation.disclaimer}
                  </p>
                )}
              </div>
            </section>

            {/* FRIENDS & GROWING CIRCLE CARD */}
            <section
              className={`card panel ${tab === 'friends' ? 'on' : ''}`}
              style={{ '--c': 'var(--teal)' }}
            >
              <div className="hd">
                🤝 Garden Circle <span className="sp">{friends.length} friends</span>
              </div>
              <div className="bd">
                <div className="search-row">
                  <div className="input-wrap" style={{ flex: 1 }}>
                    <Search size={16} />
                    <input
                      placeholder="Find friends by name or @username"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchFriends()}
                    />
                  </div>
                  <button type="button" className="btn" onClick={searchFriends}>
                    Search
                  </button>
                </div>

                {searchResults.map((u) => (
                  <div className="person-row" key={u._id}>
                    <span className="avatar-badge">{u.avatar || '🌱'}</span>
                    <div style={{ flex: 1 }}>
                      <b>{u.name}</b>
                      <div className="f">@{u.username}</div>
                    </div>
                    <button
                      type="button"
                      className="btn green"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => sendRequest(u._id)}
                    >
                      <Plus size={14} style={{ verticalAlign: 'middle' }} /> Add
                    </button>
                  </div>
                ))}

                {requests.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="f" style={{ fontWeight: 900, marginBottom: 4 }}>
                      WAITING AT YOUR GATE ({requests.length})
                    </div>
                    {requests.map((r) => (
                      <div className="person-row" key={r._id}>
                        <span className="avatar-badge">{r.from?.avatar || '🌱'}</span>
                        <div style={{ flex: 1 }}>
                          <b>{r.from?.name}</b>
                          <div className="f">@{r.from?.username}</div>
                        </div>
                        <button
                          type="button"
                          className="btn green"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => answerRequest(r._id, 'accept')}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => answerRequest(r._id, 'reject')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  {friends.length ? (
                    friends.map((f) => (
                      <button
                        type="button"
                        key={f._id}
                        className="friend-row-btn"
                        onClick={() => viewFriend(f._id)}
                      >
                        <span className="avatar-badge">{f.avatar || '🌱'}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <b>{f.name}</b>
                          <div className="f">@{f.username}</div>
                        </div>
                        <ChevronRight size={18} />
                      </button>
                    ))
                  ) : (
                    <p className="f">No friends added yet. Search above to grow together!</p>
                  )}
                </div>

                {friendProgress && (
                  <div className="friend-snap">
                    <div className="row" style={{ marginBottom: 6 }}>
                      <b>{friendProgress.user.name}'s Snapshot</b>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => setFriendProgress(null)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="f" style={{ marginBottom: 8 }}>
                      Last {friendProgress.daysTracked} tracked days
                    </div>
                    <div className="shared-grid">
                      {Object.entries(friendProgress.averages).map(([k, v]) => (
                        <div key={k} className="st">
                          <b>
                            {k === 'spending' ? `₹${v}` : v}
                            {k === 'movement' ? 'm' : k === 'spending' ? '' : 'h'}
                          </b>
                          <small>{k}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM TABS */}
      <nav className="tabs" role="tablist" aria-label="Sections">
        {[
          ['garden', '🌳', 'Garden'],
          ['habits', '🎚️', 'Habits'],
          ['quests', '🎯', 'Quests'],
          ['insights', '📊', 'Insights'],
          ['friends', '🤝', 'Friends'],
        ].map(([id, emoji, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'on' : ''}`}
            onClick={() => {
              setTab(id);
              window.scrollTo({ top: 0 });
            }}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* INTERACTIVE SVG TULSI MASCOT */}
      <TulsiMascot bubble={bubble} bubbleOn={bubbleOn} onPoke={handlePokeTulsi} />

      {/* END-OF-DAY REWARD MODAL */}
      <div
        className={`modal ${modalData ? 'show' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalData(null);
        }}
      >
        {modalData && (
          <div className="mbox">
            <div className="mtitle" style={{ color: modalData.col }}>
              {modalData.title}
            </div>
            <div className="mstats">
              {modalData.stats.map(([lbl, val]) => (
                <div className="st" key={lbl}>
                  <b>{val}</b>
                  <small>{lbl}</small>
                </div>
              ))}
            </div>
            <p>{modalData.msg}</p>
            <button
              type="button"
              className="btn green big"
              style={{ marginTop: 14 }}
              onClick={() => setModalData(null)}
            >
              Continue
            </button>
          </div>
        )}
      </div>

      {/* TOAST NOTIFICATION */}
      <div id="toast" className={toastMsg ? 'show' : ''} aria-live="polite">
        {toastMsg}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);