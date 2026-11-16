import React, { useState } from 'react';

export default function TulsiMascot({ bubble, bubbleOn, onPoke }) {
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