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

export default app;
