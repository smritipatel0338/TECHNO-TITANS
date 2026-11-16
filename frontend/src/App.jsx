import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Check,
  ChevronRight,
  LogOut,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api, getToken } from './api';
import {
  BADGES,
  cl,
  computeScores,
  EVENTS,
  getStage,
  healthAt,
  hms,
  planBHabits,
  PRESETS,
  QUEST_DEFS,
  TIPS,
  valIndex,
} from './utils/treeEngine';
import ButterfliesCanvas from './component/ButterfliesCanvas';
import DualTreeStage from './component/DualTreeStage';
import TulsiMascot from './component/TulsiMascot';
import AuthScreen from './component/AuthScreen';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const defaultHabits = { sleep: 6, study: 2, screen: 7, movement: 30, spending: 600 };

export default function App() {
  // Auth & Navigation
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fy_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(getToken());
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'
  const [authForm, setAuthForm] = useState({ name: '', username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
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
    setAuthSuccess('');
    try {
      if (authMode === 'forgot') {
        await api('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: authForm.email }),
        });
        setAuthSuccess('Password reset instructions sent to your email! ✉️');
        setBusy(false);
        return;
      }

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

  // Save Habits & End the Day
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

  // Friends Actions (Fully Operational)
  async function searchFriends() {
    if (!query || query.trim().length < 2) return;
    try {
      const d = await api(`/friends/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(d.users || d || []);
    } catch (err) {
      notify(err.message);
    }
  }

  async function sendRequest(id) {
    try {
      await api(`/friends/request/${id}`, { method: 'POST' });
      notify('Friend request sent! 🌿');
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
      const f = await api('/friends');
      setFriends(f.friends || []);
      setRequests(f.requests || []);
      notify(action === 'accept' ? 'Friend request accepted! 🌸' : 'Request declined.');
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

  // Chart Data for Insights
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

  if (!token || !user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        onSubmit={submitAuth}
        error={authError}
        success={authSuccess}
        busy={busy}
      />
    );
  }

  const level = Math.floor(game.xp / 100) + 1;
  const xpMod = game.xp % 100;

  return (
    <>
      <ButterfliesCanvas hb={hb} />

      {/* STICKY COMIC TOP BAR */}
      <header className="top ios-safe-top">
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

      {/* MAIN 2-COLUMN DASHBOARD (STICKY LEFT, SCROLLABLE RIGHT) */}
      <main className="app ios-safe-bottom">
        <div className="grid fixed-split-grid">
          {/* LEFT COLUMN: STICKY LIVING TREE GARDEN */}
          <div className="col sticky-col">
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

          {/* RIGHT COLUMN: HABITS, QUESTS, INSIGHTS, FRIENDS (SCROLLABLE) */}
          <div className="col scrollable-col">
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
      <nav className="tabs ios-safe-bottom" role="tablist" aria-label="Sections">
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