import { Router } from 'express';
import Habit from '../models/Habit.js';
import { auth } from '../middleware/auth.js';
const router = Router(); router.use(auth);
router.get('/', async (req, res, next) => { try { const items = await Habit.find({ user: req.user.id }).sort({ date: -1 }).limit(90); res.json({ habits: items }); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => {
  try {
    const { date, sleep, study, screen, movement, spending, notes } = req.body;
    const values = { sleep: Number(sleep), study: Number(study), screen: Number(screen), movement: Number(movement), spending: Number(spending) };
    if (!date || Object.values(values).some(v => !Number.isFinite(v) || v < 0)) return res.status(400).json({ message: 'Enter a valid date and non-negative habit values.' });
    const habit = await Habit.findOneAndUpdate({ user: req.user.id, date }, { $set: { ...values, notes: notes || '' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.status(201).json({ habit });
  } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try {
    const habits = await Habit.find({ user: req.user.id }).sort({ date: -1 }).limit(30);
    const avg = key => habits.length ? +(habits.reduce((s, h) => s + h[key], 0) / habits.length).toFixed(1) : 0;
    res.json({ count: habits.length, averages: { sleep: avg('sleep'), study: avg('study'), screen: avg('screen'), movement: avg('movement'), spending: avg('spending') }, history: habits.reverse() });
  } catch (e) { next(e); }
});
export default router;
