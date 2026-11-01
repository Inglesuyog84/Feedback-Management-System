const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

app.use(express.json());
app.use(express.static(__dirname));

function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, surname: user.surname, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  return auth(req, res, () => req.user.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Admin access required' }));
}

function normalizeQuestion(row) {
  return { ...row, options: JSON.parse(row.options || '[]'), required: Boolean(row.required) };
}

function getForm(id) {
  const form = db.prepare('SELECT id, title, description, is_active, created_at FROM forms WHERE id = ?').get(id);
  if (!form) return null;
  form.is_active = Boolean(form.is_active);
  form.questions = db.prepare('SELECT id, text, type, options, required, position FROM questions WHERE form_id = ? ORDER BY position, id')
    .all(id).map(normalizeQuestion);
  return form;
}

app.post('/api/auth/register', (req, res) => {
  const { name, surname, email, password } = req.body || {};
  if (!name || !surname || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, surname, email, and a password of at least 6 characters are required' });
  }
  try {
    const result = db.prepare('INSERT INTO users (name, surname, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(String(name).trim(), String(surname).trim(), String(email).trim(), bcrypt.hashSync(password, 10));
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email is already registered' });
    throw error;
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT id, name, surname, email, password_hash, role FROM users WHERE email = ?').get(email || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const { password_hash, ...safeUser } = user;
  res.json({ token: tokenFor(safeUser), user: safeUser });
});

function mailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !process.env.MAIL_FROM) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM must be configured');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_PORT) === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, '') }
  });
}

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body && req.body.email || '').trim();
  const generic = { message: 'If an account exists for that email, a password reset link has been sent.' };
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) return res.json(generic);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').run(user.id, Date.now());
  db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, tokenHash, expiresAt);
  const resetUrl = `${APP_BASE_URL}/reset-password.html?token=${rawToken}`;
  try {
    await mailTransport().sendMail({
      from: `"Feedback Management System" <${process.env.MAIL_FROM}>`,
      replyTo: process.env.MAIL_FROM,
      to: user.email,
      subject: 'Reset your Feedback Management System password',
      text: `Use this link to reset your password. It expires in 10 minutes:\n\n${resetUrl}`,
      html: `<p>Use the link below to reset your password. It expires in 10 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`
    });
  } catch (error) {
    db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(tokenHash);
    console.error('Password reset email failed:', error.message);
    return res.status(503).json({ error: 'Password reset email could not be sent. Check the SMTP configuration.' });
  }
  res.json(generic);
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: 'A valid token and a password of at least 6 characters are required' });
  }
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const reset = db.prepare('SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL')
    .get(tokenHash, Date.now());
  if (!reset) return res.status(400).json({ error: 'This reset link is invalid or expired' });
  const update = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), reset.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(Date.now(), reset.id);
  });
  update();
  res.json({ message: 'Password reset successfully. You can now log in.' });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json(db.prepare('SELECT id, name, surname, email, role FROM users WHERE id = ?').get(req.user.id));
});

app.get('/api/forms', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.title, f.description, f.is_active,
      (SELECT COUNT(*) FROM questions q WHERE q.form_id = f.id) question_count,
      (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) response_count,
      EXISTS (SELECT 1 FROM responses r WHERE r.form_id = f.id AND r.user_id = ?) submitted
    FROM forms f
    WHERE ? = 'admin' OR f.is_active = 1
    ORDER BY f.id DESC
  `).all(req.user.id, req.user.role);
  res.json(rows.map(row => ({ ...row, is_active: Boolean(row.is_active), submitted: Boolean(row.submitted) })));
});

app.get('/api/admin/stats', adminOnly, (req, res) => {
  res.json({
    forms: db.prepare('SELECT COUNT(*) count FROM forms').get().count,
    activeForms: db.prepare('SELECT COUNT(*) count FROM forms WHERE is_active = 1').get().count,
    users: db.prepare("SELECT COUNT(*) count FROM users WHERE role = 'user'").get().count,
    responses: db.prepare('SELECT COUNT(*) count FROM responses').get().count
  });
});

app.get('/api/forms/:id', auth, (req, res) => {
  const form = getForm(req.params.id);
  if (!form || (req.user.role !== 'admin' && !form.is_active)) return res.status(404).json({ error: 'Form not found' });
  res.json(form);
});

app.post('/api/forms', adminOnly, (req, res) => {
  const { title, description = '' } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
  const result = db.prepare('INSERT INTO forms (title, description) VALUES (?, ?)').run(String(title).trim(), String(description));
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/forms/:id', adminOnly, (req, res) => {
  const { title, description = '', is_active = false } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
  const result = db.prepare('UPDATE forms SET title = ?, description = ?, is_active = ? WHERE id = ?')
    .run(String(title).trim(), String(description), is_active ? 1 : 0, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Form not found' });
  res.json({ ok: true });
});

app.delete('/api/forms/:id', adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM forms WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Form not found' });
  res.json({ ok: true });
});

function validateQuestion(body) {
  const { text, type, options = [], required = true } = body || {};
  if (!text || !['rating', 'choice', 'text'].includes(type)) return 'Question text and a valid type are required';
  if (type === 'choice' && (!Array.isArray(options) || options.length < 2)) return 'Multiple-choice questions need at least 2 options';
  return null;
}

app.post('/api/forms/:id/questions', adminOnly, (req, res) => {
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ error });
  if (!db.prepare('SELECT id FROM forms WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Form not found' });
  const { text, type, options = [], required = true } = req.body;
  const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 position FROM questions WHERE form_id = ?').get(req.params.id).position;
  const result = db.prepare('INSERT INTO questions (form_id, text, type, options, required, position) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, String(text).trim(), type, JSON.stringify(type === 'choice' ? options : []), required ? 1 : 0, position);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/questions/:id', adminOnly, (req, res) => {
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ error });
  const { text, type, options = [], required = true } = req.body;
  const result = db.prepare('UPDATE questions SET text = ?, type = ?, options = ?, required = ? WHERE id = ?')
    .run(String(text).trim(), type, JSON.stringify(type === 'choice' ? options : []), required ? 1 : 0, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Question not found' });
  res.json({ ok: true });
});

app.delete('/api/questions/:id', adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Question not found' });
  res.json({ ok: true });
});

app.post('/api/forms/:id/responses', auth, (req, res) => {
  const form = getForm(req.params.id);
  if (!form || !form.is_active) return res.status(404).json({ error: 'Form not found' });
  const answers = req.body && req.body.answers;
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Answers are required' });
  for (const q of form.questions) {
    const value = answers[q.id];
    if (q.required && (value === undefined || String(value).trim() === '')) return res.status(400).json({ error: `Answer required: ${q.text}` });
    if (value !== undefined && q.type === 'rating' && !/^[1-5]$/.test(String(value))) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    if (value !== undefined && q.type === 'choice' && !q.options.includes(String(value))) return res.status(400).json({ error: 'Invalid choice selected' });
  }
  const submit = db.transaction(() => {
    const response = db.prepare('INSERT INTO responses (form_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
    const insert = db.prepare('INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)');
    for (const q of form.questions) if (answers[q.id] !== undefined) insert.run(response.lastInsertRowid, q.id, String(answers[q.id]));
  });
  try { submit(); } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'You have already submitted this form' });
    throw error;
  }
  res.status(201).json({ ok: true });
});

app.get('/api/forms/:id/responses', adminOnly, (req, res) => {
  const form = getForm(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const responses = db.prepare(`
    SELECT r.id, r.submitted_at, u.name, u.surname, u.email
    FROM responses r JOIN users u ON u.id = r.user_id
    WHERE r.form_id = ? ORDER BY r.submitted_at DESC
  `).all(req.params.id);
  const answerRows = db.prepare('SELECT response_id, question_id, value FROM answers WHERE response_id IN (SELECT id FROM responses WHERE form_id = ?)').all(req.params.id);
  const byResponse = new Map(responses.map(r => [r.id, { ...r, answers: {} }]));
  answerRows.forEach(a => byResponse.get(a.response_id).answers[a.question_id] = a.value);
  res.json({ questions: form.questions, responses: [...byResponse.values()] });
});

app.delete('/api/responses/:id', adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM responses WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Response not found' });
  res.json({ ok: true });
});

app.get('/api/forms/:id/summary', adminOnly, (req, res) => {
  const form = getForm(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const total = db.prepare('SELECT COUNT(*) count FROM responses WHERE form_id = ?').get(req.params.id).count;
  const summary = form.questions.map(q => {
    const values = db.prepare('SELECT a.value FROM answers a JOIN responses r ON r.id = a.response_id WHERE r.form_id = ? AND a.question_id = ?').all(req.params.id, q.id).map(x => x.value);
    const counts = {};
    if (q.type === 'rating') [1, 2, 3, 4, 5].forEach(n => { counts[n] = values.filter(v => v === String(n)).length; });
    if (q.type === 'choice') q.options.forEach(o => { counts[o] = values.filter(v => v === o).length; });
    return { id: q.id, text: q.text, type: q.type, answered: values.length, average: q.type === 'rating' && values.length ? (values.reduce((sum, v) => sum + Number(v), 0) / values.length).toFixed(2) : '0.00', counts, texts: q.type === 'text' ? values : [] };
  });
  res.json({ form, total, summary });
});

app.get('/api/my/responses', auth, (req, res) => {
  res.json(db.prepare(`
    SELECT r.id, r.submitted_at, f.title
    FROM responses r JOIN forms f ON f.id = r.form_id
    WHERE r.user_id = ? ORDER BY r.submitted_at DESC
  `).all(req.user.id));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(__dirname, 'index.html'));
  next();
});

app.listen(PORT, HOST, () => console.log(`Feedback Management System running at http://localhost:${PORT}`));
