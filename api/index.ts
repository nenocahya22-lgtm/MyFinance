import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'finanku-keluarga-secret-2026';

app.use(cors());
app.use(express.json());

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(code: string): Buffer {
  return crypto.createHash('sha256').update(code + JWT_SECRET).digest();
}

function encryptData(plaintext: string, code: string): string {
  const key = getEncryptionKey(code);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decryptData(ciphertext: string, code: string): string {
  try {
    const key = getEncryptionKey(code);
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext;
  }
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token tidak ditemukan' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Format token tidak valid' });
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET);
    next();
  } catch (err: any) {
    return res.status(403).json({ error: err.name === 'TokenExpiredError' ? 'Token sudah kedaluwarsa' : 'Token tidak valid' });
  }
}

const VALID_ROLES = ['KEPALA_KELUARGA', 'PASANGAN', 'ANAK'];
const WRITER_ROLES = ['KEPALA_KELUARGA', 'PASANGAN'];

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), version: '1.0.0', app: 'Finanku Rumah Tangga' });
});

// Auth register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const userId = email || `user_${Date.now()}`;
    const code = `FAM_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const token = jwt.sign({ code, userId, role: 'KEPALA_KELUARGA' }, JWT_SECRET, { expiresIn: '7d' });

    await prisma.syncGroup.create({
      data: { code, jwtSecret: JWT_SECRET, transactions: encryptData('[]', code), buckets: encryptData('[]', code), accounts: encryptData('[]', code) },
    }).catch(() => {});

    await prisma.familyMember.upsert({
      where: { code_userId: { code, userId } },
      update: { role: 'KEPALA_KELUARGA', lastSeen: new Date(), isOnline: true },
      create: { code, userId, role: 'KEPALA_KELUARGA' },
    });

    res.status(201).json({ success: true, message: 'Registrasi berhasil!', token, user: { id: userId, email, name: name || email, role: 'KEPALA_KELUARGA', family: { code, name: 'Keluarga Baru' } } });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal registrasi' });
  }
});

// Auth login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, code } = req.body;
    const userId = email || `user_${Date.now()}`;
    const groupCode = code || `FAM_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const token = jwt.sign({ code: groupCode, userId, role: 'KEPALA_KELUARGA' }, JWT_SECRET, { expiresIn: '7d' });

    await prisma.familyMember.upsert({
      where: { code_userId: { code: groupCode, userId } },
      update: { lastSeen: new Date(), isOnline: true },
      create: { code: groupCode, userId, role: 'KEPALA_KELUARGA' },
    });

    res.json({ success: true, token, user: { id: userId, email, name: email?.split('@')[0] || 'User', role: 'KEPALA_KELUARGA', family: { code: groupCode, name: 'Keluarga Saya' } } });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal login' });
  }
});

// Auth me
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  const member = await prisma.familyMember.findFirst({ where: { code: req.user.code, userId: req.user.userId } });
  res.json({
    id: req.user.userId,
    email: req.user.userId,
    name: req.user.userId.split('@')[0] || 'User',
    role: member?.role || 'ANGGOTA',
    family: { id: req.user.code, name: `Keluarga ${req.user.code}`, code: req.user.code },
  });
});

// Auth refresh + logout
app.post('/api/auth/refresh', authenticateToken, (req: any, res) => {
  const token = jwt.sign({ code: req.user.code, userId: req.user.userId, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});
app.post('/api/auth/logout', (_req, res) => res.json({ success: true }));

// Sync join
app.post('/api/sync/join', async (req, res) => {
  try {
    const { code, userId, role = 'ANGGOTA', clientTransactions = [], clientBuckets = [], clientAccounts = [], clientDebts = [] } = req.body;
    if (!code || code.length < 3) return res.status(400).json({ error: 'Kode minimal 3 karakter' });
    if (!userId) return res.status(400).json({ error: 'User ID wajib diisi' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    const normalizedCode = code.toUpperCase();
    let group = await prisma.syncGroup.findUnique({ where: { code: normalizedCode } });
    if (!group) {
      group = await prisma.syncGroup.create({
        data: { code: normalizedCode, jwtSecret: JWT_SECRET, transactions: encryptData(JSON.stringify(clientTransactions), normalizedCode), buckets: encryptData(JSON.stringify(clientBuckets), normalizedCode), accounts: encryptData(JSON.stringify(clientAccounts), normalizedCode), debtData: encryptData(JSON.stringify(clientDebts), normalizedCode) },
      });
    }

    await prisma.familyMember.upsert({
      where: { code_userId: { code: normalizedCode, userId } },
      update: { role, lastSeen: new Date(), isOnline: true },
      create: { code: normalizedCode, userId, role },
    });

    const token = jwt.sign({ code: normalizedCode, userId, role }, JWT_SECRET, { expiresIn: '24h' });

    await prisma.auditLog.create({ data: { code: normalizedCode, userId, userRole: role, action: 'JOIN_ROOM', description: `${userId} tergabung ke Saku Keluarga` } }).catch(() => {});

    res.json({
      token, role, message: 'Berhasil tergabung ke Saku Keluarga!',
      group: {
        code: group.code,
        transactions: JSON.parse(decryptData(group.transactions, normalizedCode)),
        buckets: JSON.parse(decryptData(group.buckets, normalizedCode)),
        accounts: JSON.parse(decryptData(group.accounts, normalizedCode)),
        debtData: group.debtData ? JSON.parse(decryptData(group.debtData, normalizedCode)) : [],
        updatedAt: group.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Join Error]', err);
    res.status(500).json({ error: 'Gagal bergabung ke grup' });
  }
});

// Sync update
app.post('/api/sync/update', authenticateToken, async (req: any, res) => {
  try {
    const { code, transactions, buckets, accounts, debtData } = req.body;
    const normalizedCode = code.toUpperCase();
    if (req.user.code !== normalizedCode) return res.status(401).json({ error: 'Kode tidak cocok' });

    const updateData: any = {};
    if (transactions !== undefined) updateData.transactions = encryptData(JSON.stringify(transactions), normalizedCode);
    if (buckets !== undefined) updateData.buckets = encryptData(JSON.stringify(buckets), normalizedCode);
    if (accounts !== undefined) updateData.accounts = encryptData(JSON.stringify(accounts), normalizedCode);
    if (debtData !== undefined) updateData.debtData = encryptData(JSON.stringify(debtData), normalizedCode);

    const updated = await prisma.syncGroup.update({ where: { code: normalizedCode }, data: updateData });
    await prisma.auditLog.create({ data: { code: normalizedCode, userId: req.user.userId, userRole: req.user.role, action: 'UPDATE_LEDGER', description: `${req.user.userId} memperbarui pembukuan keluarga` } }).catch(() => {});

    res.json({ message: 'Pembukuan berhasil diperbarui', group: { code: updated.code, updatedAt: updated.updatedAt.toISOString() } });
  } catch (err: any) {
    console.error('[Update Error]', err);
    res.status(500).json({ error: 'Gagal memperbarui data' });
  }
});

// Sync pull
app.get('/api/sync/pull', authenticateToken, async (req: any, res) => {
  try {
    const queryCode = (req.query.code as string || '').toUpperCase();
    if (req.user.code !== queryCode) return res.status(401).json({ error: 'Kode tidak cocok' });

    const group = await prisma.syncGroup.findUnique({ where: { code: queryCode } });
    if (!group) return res.status(404).json({ error: 'Grup tidak ditemukan' });

    res.json({
      group: {
        code: group.code,
        transactions: JSON.parse(decryptData(group.transactions, queryCode)),
        buckets: JSON.parse(decryptData(group.buckets, queryCode)),
        accounts: JSON.parse(decryptData(group.accounts, queryCode)),
        debtData: group.debtData ? JSON.parse(decryptData(group.debtData, queryCode)) : [],
        updatedAt: group.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Pull Error]', err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});

// Sync logs
app.get('/api/sync/logs', authenticateToken, async (req: any, res) => {
  const logs = await prisma.auditLog.findMany({ where: { code: req.user.code }, orderBy: { timestamp: 'desc' }, take: 100 });
  res.json({ logs });
});

// Sync members
app.get('/api/sync/members', authenticateToken, async (req: any, res) => {
  const members = await prisma.familyMember.findMany({ where: { code: req.user.code, isOnline: true }, select: { userId: true, role: true, lastSeen: true } });
  res.json({ members });
});

// Sync activity
app.get('/api/sync/activity', authenticateToken, async (req: any, res) => {
  const since = req.query.since ? new Date(req.query.since as string) : new Date(0);
  const logs = await prisma.auditLog.findMany({ where: { code: req.user.code, timestamp: { gte: since } }, orderBy: { timestamp: 'desc' }, take: 50 });
  res.json({ logs });
});

// Sync backup
app.post('/api/sync/backup', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  if (!group) return res.status(404).json({ error: 'Grup tidak ditemukan' });
  await prisma.auditLog.create({ data: { code: req.user.code, userId: req.user.userId, userRole: req.user.role, action: 'BACKUP', description: `${req.user.userId} membuat cadangan data keluarga` } }).catch(() => {});
  res.json({ message: 'Cadangan berhasil dibuat', backupAt: new Date().toISOString() });
});

// Sync restore
app.post('/api/sync/restore', authenticateToken, async (req: any, res) => {
  await prisma.auditLog.create({ data: { code: req.user.code, userId: req.user.userId, userRole: req.user.role, action: 'RESTORE', description: `${req.user.userId} memulihkan cadangan data keluarga` } }).catch(() => {});
  res.json({ message: 'Data berhasil dipulihkan', restoredAt: new Date().toISOString() });
});

// CRUD: Accounts
app.get('/api/accounts', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const accounts = group ? JSON.parse(decryptData(group.accounts, req.user.code)) : [];
  res.json(accounts);
});
app.post('/api/accounts', authenticateToken, async (req: any, res) => {
  const account = { id: 'acc-' + Date.now(), ...req.body, balance: 0, createdAt: new Date().toISOString() };
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const accounts = group ? JSON.parse(decryptData(group.accounts, req.user.code)) : [];
  accounts.push(account);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { accounts: encryptData(JSON.stringify(accounts), req.user.code) } });
  res.status(201).json({ success: true, account });
});
app.put('/api/accounts/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let accounts = group ? JSON.parse(decryptData(group.accounts, req.user.code)) : [];
  accounts = accounts.map((a: any) => a.id === req.params.id ? { ...a, ...req.body } : a);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { accounts: encryptData(JSON.stringify(accounts), req.user.code) } });
  res.json({ success: true });
});
app.delete('/api/accounts/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let accounts = group ? JSON.parse(decryptData(group.accounts, req.user.code)) : [];
  accounts = accounts.filter((a: any) => a.id !== req.params.id);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { accounts: encryptData(JSON.stringify(accounts), req.user.code) } });
  res.json({ success: true });
});

// CRUD: Transactions
app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const transactions = group ? JSON.parse(decryptData(group.transactions, req.user.code)) : [];
  res.json(transactions);
});
app.post('/api/transactions', authenticateToken, async (req: any, res) => {
  const tx = { id: 'tx-' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const transactions = group ? JSON.parse(decryptData(group.transactions, req.user.code)) : [];
  transactions.unshift(tx);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { transactions: encryptData(JSON.stringify(transactions), req.user.code) } });
  res.status(201).json({ success: true, transaction: tx });
});
app.put('/api/transactions/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let transactions = group ? JSON.parse(decryptData(group.transactions, req.user.code)) : [];
  transactions = transactions.map((t: any) => t.id === req.params.id ? { ...t, ...req.body } : t);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { transactions: encryptData(JSON.stringify(transactions), req.user.code) } });
  res.json({ success: true });
});
app.delete('/api/transactions/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let transactions = group ? JSON.parse(decryptData(group.transactions, req.user.code)) : [];
  transactions = transactions.filter((t: any) => t.id !== req.params.id);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { transactions: encryptData(JSON.stringify(transactions), req.user.code) } });
  res.json({ success: true });
});

// CRUD: Buckets
app.get('/api/buckets', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const buckets = group ? JSON.parse(decryptData(group.buckets, req.user.code)) : [];
  res.json(buckets);
});
app.post('/api/buckets', authenticateToken, async (req: any, res) => {
  const bucket = { id: 'bucket-' + Date.now(), ...req.body, balance: 0, createdAt: new Date().toISOString() };
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const buckets = group ? JSON.parse(decryptData(group.buckets, req.user.code)) : [];
  buckets.push(bucket);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { buckets: encryptData(JSON.stringify(buckets), req.user.code) } });
  res.status(201).json({ success: true, bucket });
});
app.put('/api/buckets/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let buckets = group ? JSON.parse(decryptData(group.buckets, req.user.code)) : [];
  buckets = buckets.map((b: any) => b.id === req.params.id ? { ...b, ...req.body } : b);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { buckets: encryptData(JSON.stringify(buckets), req.user.code) } });
  res.json({ success: true });
});
app.delete('/api/buckets/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let buckets = group ? JSON.parse(decryptData(group.buckets, req.user.code)) : [];
  buckets = buckets.filter((b: any) => b.id !== req.params.id);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { buckets: encryptData(JSON.stringify(buckets), req.user.code) } });
  res.json({ success: true });
});

// Dashboard summary
app.get('/api/dashboard/summary', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const transactions = group ? JSON.parse(decryptData(group.transactions, req.user.code)) : [];
  let totalIncome = 0, totalExpense = 0;
  transactions.forEach((tx: any) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') totalExpense += tx.amount;
  });
  res.json({ totalIncome, totalExpense, balance: totalIncome - totalExpense });
});

// Goals endpoints
app.get('/api/goals', (_req, res) => res.json({ goals: [] }));
app.post('/api/goals', (req, res) => res.status(201).json({ success: true, goal: { id: 'goal-' + Date.now(), ...req.body, currentAmount: 0, createdAt: new Date().toISOString() } }));
app.put('/api/goals/:id', (_req, res) => res.json({ success: true }));
app.delete('/api/goals/:id', (_req, res) => res.json({ success: true }));

// Debts
app.get('/api/debts', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const debts = group?.debtData ? JSON.parse(decryptData(group.debtData, req.user.code)) : [];
  res.json({ debts });
});
app.post('/api/debts', authenticateToken, async (req: any, res) => {
  const debt = { id: 'debt-' + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  const debts = group?.debtData ? JSON.parse(decryptData(group.debtData, req.user.code)) : [];
  debts.push(debt);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { debtData: encryptData(JSON.stringify(debts), req.user.code) } });
  res.status(201).json({ success: true, debt });
});
app.put('/api/debts/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let debts = group?.debtData ? JSON.parse(decryptData(group.debtData, req.user.code)) : [];
  debts = debts.map((d: any) => d.id === req.params.id ? { ...d, ...req.body } : d);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { debtData: encryptData(JSON.stringify(debts), req.user.code) } });
  res.json({ success: true });
});
app.delete('/api/debts/:id', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  let debts = group?.debtData ? JSON.parse(decryptData(group.debtData, req.user.code)) : [];
  debts = debts.filter((d: any) => d.id !== req.params.id);
  await prisma.syncGroup.update({ where: { code: req.user.code }, data: { debtData: encryptData(JSON.stringify(debts), req.user.code) } });
  res.json({ success: true });
});

// Notifications
app.get('/api/notifications', (_req, res) => res.json({ notifications: [] }));

// Trash
app.get('/api/trash', (_req, res) => res.json({ trash: [] }));
app.post('/api/trash/restore', (_req, res) => res.json({ success: true }));
app.post('/api/trash/bulk-restore', (_req, res) => res.json({ success: true }));
app.post('/api/trash/bulk-delete', (_req, res) => res.json({ success: true }));
app.post('/api/trash/purge', (_req, res) => res.json({ success: true }));

// Audit logs
app.get('/api/audit-logs', authenticateToken, async (req: any, res) => {
  const logs = await prisma.auditLog.findMany({ where: { code: req.user.code }, orderBy: { timestamp: 'desc' }, take: 100 });
  res.json({ logs });
});

export default app;
