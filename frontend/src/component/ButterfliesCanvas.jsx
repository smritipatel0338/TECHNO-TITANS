import React, { useEffect, useRef } from 'react';

const PALETTE = [
  ['#ff8fb1', '#ffd1e0'],
  ['#6ec8ff', '#c5ecff'],
  ['#ffd23f', '#fff0a8'],
  ['#b48cff', '#e3d3ff'],
  ['#7ae582', '#d3f8d7'],
  ['#ff9a3c', '#ffd8ad'],
];

export default function ButterfliesCanvas({ hb }) {
  const canvasRef = useRef(null);
  const hbRef = useRef(hb);
  hbRef.current = hb;

  useEffect(() => {
    const bc = canvasRef.current;
    if (!bc) return;
    const bx = bc.getContext('2d');
    const rm =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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