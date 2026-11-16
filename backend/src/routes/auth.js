import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { sendResetOtpEmail } from '../utils/mailer.js';

const router = Router();

const tokenFor = (user) =>
  jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
});

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// 1. REQUEST PASSWORD RESET OTP VIA GMAIL
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If an account exists for that email, a 6-digit code has been sent.' });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    await sendResetOtpEmail(user.email, user.name, otp);

    res.json({
      message: 'We sent a 6-digit reset code to your Gmail inbox.',
    });
  } catch (err) {
    next(err);
  }
});

// 2. VERIFY OTP & SET NEW PASSWORD
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, 6-digit code, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    if (Date.now() > user.resetOtpExpiresAt.getTime()) {
      user.resetOtpHash = null;
      user.resetOtpExpiresAt = null;
      await user.save();
      return res.status(400).json({ message: 'Reset code has expired. Request a new one.' });
    }

    const validOtp = await bcrypt.compare(String(otp).trim(), user.resetOtpHash);
    if (!validOtp) {
      return res.status(400).json({ message: 'Incorrect 6-digit reset code' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetOtpHash = null;
    user.resetOtpExpiresAt = null;
    await user.save();

    const token = tokenFor(user);
    setTokenCookie(res, token);

    res.json({
      message: 'Password updated successfully!',
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// 3. REGISTER WITH SECURE COOKIE
router.post('/register', async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Please complete every field.' });
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3–24 letters, numbers or underscores.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (exists) {
      return res.status(409).json({ message: 'Email or username is already registered.' });
    }

    const user = await User.create({
      name,
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    const token = tokenFor(user);

    setTokenCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// 4. LOGIN WITH SECURE COOKIE
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    const token = tokenFor(user);
    setTokenCookie(res, token);

    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// 5. LOGOUT (Clears HttpOnly Cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully.' });
});

// 6. GET CURRENT USER PROFILE
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

export default router;