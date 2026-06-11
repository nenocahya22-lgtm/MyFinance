import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'termux_super_secret_key';

// Middleware dasar agar aplikasi React/Vite bisa komunikasi lancar
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// 🛠️ BYPASS UTAMA: Endpoint Registrasi & Login Otomatis Lolos
app.post('/api/auth/register', (req, res) => {
  console.log("[Termux-Bypass] Menerima data registrasi:", req.body);
  
  const fakeUser = {
    id: "termux-owner-id",
    email: req.body.email || "joshua@gmail.com",
    name: req.body.name || "Joshua",
    role: "OWNER",
    familyId: "termux-family-id"
  };
  
  const token = jwt.sign(fakeUser, JWT_SECRET, { expiresIn: '7d' });
  
  return res.status(201).json({
    success: true,
    message: "Registrasi berhasil (Bypass Termux)",
    token,
    user: fakeUser
  });
});

app.post('/api/auth/login', (req, res) => {
  const fakeUser = { id: "termux-owner-id", email: req.body.email, name: "Joshua", role: "OWNER" };
  const token = jwt.sign(fakeUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, token, user: fakeUser });
});

// Endpoint data user agar dashboard tidak kosong
app.get('/api/auth/me', (req, res) => {
  return res.json({
    id: "termux-owner-id",
    email: "joshua@gmail.com",
    name: "Joshua",
    role: "OWNER",
    family: { id: "termux-family-id", name: "Keluarga Utama", code: "TRMX123" }
  });
});

// Endpoint dummy untuk fitur finansial agar tidak error saat diklik
app.get('/api/accounts', (req, res) => res.json([]));
app.get('/api/transactions', (req, res) => res.json([]));
app.get('/api/buckets', (req, res) => res.json([]));
app.get('/api/dashboard/summary', (req, res) => res.json({ totalIncome: 0, totalExpense: 0, balance: 0 }));

// Hubungkan dengan file frontend hasil build Vite (Menggunakan __dirname murni)
const targetDist = path.join(process.cwd(), 'dist');
app.use(express.static(targetDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(targetDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log("\n=======================================================");
  console.log("🚀 [Termux Local Engine] Server Berhasil Dinyalakan!");
  console.log(`🔗 Silakan akses di: http://localhost:${PORT}`);
  console.log("=======================================================\n");
});
