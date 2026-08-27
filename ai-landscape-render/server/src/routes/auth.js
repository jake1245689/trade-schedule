const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(normalizedEmail, passwordHash);

  const user = { id: info.lastInsertRowid, email: normalizedEmail };
  const token = signToken(user);
  res.cookie('session', token, cookieOptions());
  res.status(201).json({ user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(normalizedEmail);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const user = { id: row.id, email: row.email };
  const token = signToken(user);
  res.cookie('session', token, cookieOptions());
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.userId, email: req.userEmail } });
});

module.exports = router;
