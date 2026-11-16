import React, { useEffect, useRef } from 'react';
import { drawTree, getStage, healthAt } from '../utils/treeEngine';

export default function DualTreeStage({
  ha,
  hb,
  arch,
  setArch,
  hz,
  setHz,
  age,
  setAge,
  play,
  setPlay,
}) {
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