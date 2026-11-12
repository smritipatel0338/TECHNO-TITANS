import { Router } from 'express';
import { auth } from '../middleware/auth.js';
const router = Router(); router.use(auth);
router.post('/', async (req, res) => {
  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/simulate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: req.body.user || {}, history: req.body.history || [], reinvest: req.body.reinvest ?? 1 }) });
    if (!response.ok) throw new Error('AI service returned an error');
    res.json(await response.json());
  } catch { res.status(503).json({ message: 'AI service is not running. Start the Python service on port 8000.' }); }
});
export default router;
