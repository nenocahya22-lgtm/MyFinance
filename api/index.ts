import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = 'vercel_super_secret_key';

app.use(cors());
app.use(express.json());

// 🛠️ BYPASS VERCEL SERVERLESS
app.post('/api/auth/register', (req, res) => {
  const fakeUser = {
    id: "vercel-owner-id",
    email: req.body.email || "joshua@gmail.com",
    name: req.body.name || "Joshua",
    role: "OWNER",
    familyId: "vercel-family-id"
  };
  const token = jwt.sign(fakeUser, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({ success: true, message: "Registrasi Vercel Sukses", token, user: fakeUser });
});

app.post('/api/auth/login', (req, res) => {
  const fakeUser = { id: "vercel-owner-id", email: req.body.email, name: "Joshua", role: "OWNER" };
  const token = jwt.sign(fakeUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, token, user: fakeUser });
});

app.get('/api/auth/me', (req, res) => {
  return res.json({
    id: "vercel-owner-id",
    email: "joshua@gmail.com",
    name: "Joshua",
    role: "OWNER",
    family: { id: "vercel-family-id", name: "Keluarga Utama", code: "VRCL123" }
  });
});

app.get('/api/accounts', (req, res) => res.json([]));
app.get('/api/transactions', (req, res) => res.json([]));
app.get('/api/buckets', (req, res) => res.json([]));
app.get('/api/dashboard/summary', (req, res) => res.json({ totalIncome: 0, totalExpense: 0, balance: 0 }));

// ====== MISSING ENDPOINTS ADDED ======

// Goals endpoints
app.get('/api/goals', (req, res) => res.json({ goals: [] }));
app.post('/api/goals', (req, res) => {
  const goal = { id: 'goal-' + Date.now(), ...req.body, currentAmount: 0, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, goal });
});
app.put('/api/goals/:id', (req, res) => res.json({ success: true }));
app.delete('/api/goals/:id', (req, res) => res.json({ success: true }));

// Debts endpoints
app.get('/api/debts', (req, res) => res.json({ debts: [] }));
app.post('/api/debts', (req, res) => {
  const debt = { id: 'debt-' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, debt });
});
app.put('/api/debts/:id', (req, res) => res.json({ success: true }));
app.delete('/api/debts/:id', (req, res) => res.json({ success: true }));

// Audit logs endpoint
app.get('/api/audit-logs', (req, res) => res.json({ logs: [] }));

// Notifications endpoint
app.get('/api/notifications', (req, res) => res.json({ notifications: [] }));

// Trash endpoints
app.get('/api/trash', (req, res) => res.json({ trash: [] }));
app.post('/api/trash/restore', (req, res) => res.json({ success: true }));
app.post('/api/trash/bulk-restore', (req, res) => res.json({ success: true }));
app.post('/api/trash/bulk-delete', (req, res) => res.json({ success: true }));
app.post('/api/trash/purge', (req, res) => res.json({ success: true }));

// Auth refresh & logout endpoints
app.post('/api/auth/refresh', (req, res) => {
  const fakeUser = { id: 'vercel-owner-id', email: 'joshua@gmail.com', name: 'Joshua', role: 'OWNER' };
  const token = jwt.sign(fakeUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, token });
});

app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

// Accounts PUT/DELETE endpoints (for edit/delete account)
app.put('/api/accounts/:id', (req, res) => res.json({ success: true }));
app.delete('/api/accounts/:id', (req, res) => res.json({ success: true }));
app.post('/api/accounts', (req, res) => {
  const account = { id: 'acc-' + Date.now(), ...req.body, balance: 0, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, account });
});

// Buckets PUT/DELETE endpoints
app.put('/api/buckets/:id', (req, res) => res.json({ success: true }));
app.delete('/api/buckets/:id', (req, res) => res.json({ success: true }));
app.post('/api/buckets', (req, res) => {
  const bucket = { id: 'bucket-' + Date.now(), ...req.body, balance: 0, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, bucket });
});

// Transactions POST/PUT/DELETE endpoints (for add/edit/delete transaction)
app.post('/api/transactions', (req, res) => {
  const tx = { id: 'tx-' + Date.now(), ...req.body, createdAt: new Date().toISOString(), creator: { name: 'Joshua' } };
  return res.status(201).json({ success: true, transaction: tx });
});
app.put('/api/transactions/:id', (req, res) => res.json({ success: true }));
app.delete('/api/transactions/:id', (req, res) => res.json({ success: true }));

export default app;
