<<<<<<< HEAD
# Future You — AI-powered Digital Twin of Your Habits

A full-stack hackathon application inspired by the uploaded **Future You: Living Tree Twin** prototype. The original's warm paper background, bold comic-style cards, colorful controls, garden/tree metaphor, playful Tulsi mascot and mobile bottom navigation are retained as the visual direction.

## Stack
- Frontend: React + Vite + CSS + Recharts
- Backend: Node.js + Express + MongoDB/Mongoose + JWT + bcrypt
- AI service: Python + FastAPI + scikit-learn-compatible trend analysis + optional OpenAI-compatible LLM API

## Features implemented
- Signup/login with hashed passwords and JWT-protected APIs
- Daily habit records: sleep, study, screen time, movement and spending
- Dashboard habit score, streak, daily quests and progress history
- Two scenario simulations: current routine and improved routine
- 6-month and 5-year projections, with clearly labelled illustrative estimates
- AI-generated future-self letters (LLM when configured; transparent local fallback otherwise)
- Friends: user search, friend requests, accept/reject, shared progress summaries
- Responsive navigation: desktop sidebar and mobile bottom navigation
- Original prototype preserved at `docs/original-gemini-inspiration.html`

## Run locally

### 1. Requirements
- Node.js 20+
- Python 3.10+
- MongoDB local instance or MongoDB Atlas connection string

### 2. Install dependencies
```bash
npm install
npm run install:all
cd ai-engine && python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure environment
Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a long random `JWT_SECRET`.
Copy `ai-engine/.env.example` to `ai-engine/.env`. Add `OPENAI_API_KEY` and `LLM_MODEL` only if you want live LLM-generated letters. The AI service has a local fallback when no key is configured.

### 4. Start services (three terminals)
```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — AI service
cd ai-engine && python -m uvicorn main:app --reload --port 8000

# Terminal 3 — frontend
cd frontend && npm run dev
```
Open the Vite URL (normally http://localhost:5173).

## API overview
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/habits`, `GET /api/habits/summary`
- `POST /api/simulations` (proxies to the Python AI service)
- `GET /api/friends/search?q=...`, `GET /api/friends`, `POST /api/friends/request/:userId`, `PATCH /api/friends/request/:requestId`

## AI methodology and limitations
The AI service fits scikit-learn LinearRegression trend models when at least three dated observations are available, then uses an explainable, assumption-based scenario simulator. It transforms user-entered averages and a user-adjustable reinvestment level into scenario trajectories; it is not a medical, academic or financial guarantee. The Python service derives trend/consistency signals from the available history and creates projections. With a configured LLM API, the language model explains the computed metrics in a future-self letter; it is instructed not to invent numeric predictions. With no LLM key, a deterministic local letter is returned so the demo still works.

Five-year outputs are illustrative extrapolations, not validated long-horizon forecasts. The app should collect more data and be evaluated before presenting its projections as empirically accurate.

## Before public production deployment
Set HTTPS, restrictive CORS, secure cookie/token strategy, rate limiting, email verification/password reset, abuse reporting/blocking, privacy/consent controls, backups, monitoring, database indexes and MongoDB Atlas network restrictions. Review applicable privacy laws before collecting personal habit or financial data. Never commit `.env` files.
=======
🌱 Future You: Living Tree Twin
An interactive, AI-powered digital twin web application that simulates how your everyday habits shape your long-term future.

🚀 Overview
Future You: Living Tree Twin transforms abstract daily routines into vivid, visual 2D/3D-style projections. By gamifying behavioral patterns across health, academics, and finance, the app motivates you to make data-driven decisions for a thriving future.

✨ Key Features
📊 Habit Tracking Dashboard: Track and tune daily behavioral pillars:

😴 Sleep Duration

📚 Study Hours

📱 Screen Time

🏃 Physical Activity / Movement

🪙 Spending Patterns

⚖️ The Two Futures (Side-by-Side Comparison):

Plan A (Current Routine): Projects the outcome if current habits remain unchanged.

Plan B (Reinvested Routine): Projects the outcome when healthier habits and focused time blocks are adopted.

🌳 Interactive Procedural Tree Simulation: Dynamically renders growing future-self avatars (choose between Banyan, Redwood, or Bonsai archetypes) that visually decay or flourish over 6-month and 5-year horizons.

⏳ Time Travel Scrubber: A smooth timeline slider to preview your growth stage and health index at any point between today and years into the future.

📈 Predictive Analytics & Growth Charts: Visualizes trajectory divergence and identifies lowest-pillar areas for immediate improvement.

✉️ Personalized Letters from the Future: Generates immersive, reflective notes from your future tree avatar detailing milestones and adjustments.

🎮 Gamification & Rewards: Daily quests, streak tracking, streak protection shields, XP progression, and Tulsi the Mascot who delivers secret favors and random event survival challenges (e.g., Exam storms, Heatwaves).

🎨 Atmospheric Polish: Dynamic weather/butterfly particle engines, dark/light theme toggling, and retro newspaper-inspired UI aesthetics.
>>>>>>> b2f97291cf350bb8acf2bb64826bc813a401a84a
