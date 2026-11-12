import os, math
from datetime import date
from typing import Any
import numpy as np
from sklearn.linear_model import LinearRegression
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
app = FastAPI(title='Future You AI Engine', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:5173'], allow_methods=['*'], allow_headers=['*'])

class Habit(BaseModel):
    sleep: float = Field(6, ge=0, le=24)
    study: float = Field(2, ge=0, le=24)
    screen: float = Field(7, ge=0, le=24)
    movement: float = Field(20, ge=0, le=1440)
    spending: float = Field(250, ge=0)

class SimRequest(BaseModel):
    user: dict[str, Any] = {}
    history: list[dict[str, Any]] = []
    reinvest: float = Field(1, ge=0, le=4)

def averages(history, current):
    keys = ['sleep', 'study', 'screen', 'movement', 'spending']
    clean = [{k: float(row[k]) for k in keys if k in row and row[k] is not None} for row in history[-30:]]
    out = {}
    for key in keys:
        vals = [row[key] for row in clean if key in row]
        out[key] = round(float(np.mean(vals)), 2) if vals else float(current.get(key, Habit().model_dump()[key]))
    return out, len(clean)

def dimensions(h):
    # Transparent proxies from the five tracked inputs; these are not clinical, grade or wealth predictions.
    academic = 100 * (0.65 * min(h['study'] / 4, 1) + 0.35 * max(0, 1 - max(0, h['screen'] - 3) / 9))
    health = 100 * (0.55 * max(0, 1 - abs(h['sleep'] - 8) / 6) + 0.45 * min(h['movement'] / 45, 1))
    finance = 100 * max(0, 1 - h['spending'] / 1500)
    return {'academicFocus': round(academic), 'healthRoutine': round(health), 'spendingAwareness': round(finance)}

def score(h):
    d = dimensions(h)
    return round(0.4*d['academicFocus'] + 0.4*d['healthRoutine'] + 0.2*d['spendingAwareness'])

def trend_analysis(history):
    """Fit small linear-regression trend models when at least 3 dated observations exist."""
    keys = ['sleep', 'study', 'screen', 'movement', 'spending']
    result = {}
    rows = sorted(history, key=lambda row: str(row.get('date', '')))
    for key in keys:
        vals = [float(row[key]) for row in rows if row.get(key) is not None]
        if len(vals) < 3:
            result[key] = {'direction': 'not enough data', 'changePerDay': 0, 'nextWeekEstimate': vals[-1] if vals else None}
            continue
        x = np.arange(len(vals)).reshape(-1, 1)
        model = LinearRegression().fit(x, np.array(vals))
        slope = float(model.coef_[0])
        forecast = float(model.predict(np.array([[len(vals) + 6]]))[0])
        limits = {'sleep': (0, 24), 'study': (0, 24), 'screen': (0, 24), 'movement': (0, 1440), 'spending': (0, 1000000)}
        forecast = min(limits[key][1], max(limits[key][0], forecast))
        result[key] = {'direction': 'increasing' if slope > 0.03 else 'decreasing' if slope < -0.03 else 'stable', 'changePerDay': round(slope, 3), 'nextWeekEstimate': round(forecast, 1)}
    return result

def scenario(base, improved=False, reinvest=1):
    h = dict(base)
    if improved:
        # Gradual, attainable habit targets; reinvest controls how strongly the target is approached.
        strength = min(1, 0.18 + reinvest * 0.13)
        targets = {'sleep': 8, 'study': 4, 'screen': 3.5, 'movement': 45, 'spending': max(100, base['spending'] * 0.75)}
        for key, target in targets.items(): h[key] = round(base[key] + (target-base[key])*strength, 2)
    return h

def make_projection(base, improved, months):
    # Explainable bounded trend index, not a clinical or financial forecast.
    points_a, points_b = [], []
    start_a, start_b = score(base), score(improved)
    for m in range(months + 1):
        # Saturating curves avoid unbounded extrapolation.
        a = min(100, max(0, start_a + (100-start_a)*(1-math.exp(-m/22))*0.20))
        b = min(100, max(0, start_b + (100-start_b)*(1-math.exp(-m/14))*0.55))
        points_a.append({'month': m, 'index': round(a, 1)})
        points_b.append({'month': m, 'index': round(b, 1)})
    return points_a, points_b

def fallback_letter(name, base, better, six_a, six_b, five_a, five_b):
    return (f"Dear {name},\n\nI'm writing from a possible version of your future. The habits you repeat today are small votes for the life you're building. "
      f"Your current routine has a habit score of {score(base)}/100. If it stays similar, the model's illustrative six-month index is {six_a[-1]['index']}/100. "
      f"With a few realistic changes, the comparison scenario reaches {six_b[-1]['index']}/100.\n\n"
      f"Start gently: protect a more consistent sleep window, make room for focused study, take movement breaks, and notice where screen time and spending go. "
      f"You do not need a perfect day; you need repeatable days. These projections are possibilities based on the information entered, not promises. "
      f"I'm proud of every small choice you make for us.\n\nWith hope,\nYour Future You 🌱")

def llm_letter(name, base, better, a6, b6, a5, b5):
    key = os.getenv('OPENAI_API_KEY')
    if not key: return fallback_letter(name, base, better, a6, b6, a5, b5), 'local-fallback'
    url = os.getenv('LLM_BASE_URL', 'https://api.openai.com/v1').rstrip('/') + '/chat/completions'
    prompt = f"Write a warm, personal 150-word letter from the user's future self. Be encouraging, not shaming. Explain consequences and 3 practical next steps. Do not invent numbers; use only these computed metrics. Explicitly call projections illustrative, not guaranteed. Name: {name}. Current habits: {base}. Improved scenario: {better}. Six-month current/improved index: {a6[-1]['index']}/{b6[-1]['index']}. Five-year current/improved index: {a5[-1]['index']}/{b5[-1]['index']}."
    try:
        r = requests.post(url, headers={'Authorization': f'Bearer {key}', 'Content-Type':'application/json'}, json={'model': os.getenv('LLM_MODEL','gpt-4o-mini'), 'messages':[{'role':'system','content':'You are a compassionate habit-change writing assistant. Never provide medical, academic admission or financial guarantees.'},{'role':'user','content':prompt}], 'temperature':0.7}, timeout=25)
        r.raise_for_status()
        return r.json()['choices'][0]['message']['content'], 'llm'
    except Exception:
        return fallback_letter(name, base, better, a6, b6, a5, b5), 'local-fallback'

@app.get('/health')
def health(): return {'status':'ok','service':'future-you-ai'}

@app.post('/simulate')
def simulate(payload: SimRequest):
    current, sample_count = averages(payload.history, payload.user)
    better = scenario(current, True, payload.reinvest)
    a6,b6 = make_projection(current, better, 6)
    a5,b5 = make_projection(current, better, 60)
    letter, source = llm_letter(payload.user.get('name','friend'), current, better, a6,b6,a5,b5)
    return {
      'generatedAt': date.today().isoformat(), 'sampleDays': sample_count,
      'method': 'Linear-regression trend analysis on logged habits + explainable scenario simulation with gradual target adjustment',
      'trends': trend_analysis(payload.history),
      'disclaimer': 'Illustrative scenario, not a guaranteed or scientifically validated long-term forecast.',
      'current': {'habits': current, 'score': score(current), 'dimensions': dimensions(current)},
      'improved': {'habits': better, 'score': score(better), 'dimensions': dimensions(better)},
      'sixMonths': {'current': a6, 'improved': b6, 'gap': round(b6[-1]['index']-a6[-1]['index'],1)},
      'fiveYears': {'current': a5, 'improved': b5, 'gap': round(b5[-1]['index']-a5[-1]['index'],1)},
      'letter': letter, 'letterSource': source,
      'dimensionNotes': {'academicFocus': 'Study time and screen-time balance proxy; not a predicted grade or GPA.', 'healthRoutine': 'Sleep and movement habit proxy; not a medical assessment.', 'spendingAwareness': 'Spending level proxy only; income, savings and financial security are not known.'},
      'insights': [
        'Your sleep, focused study and movement routines contribute to the habit score.',
        'Reducing high screen time can create more room for rest and focused activities.',
        'Track spending consistently to understand your personal saving opportunities.'
      ]
    }
