import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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

function isHead(req: any, res: any, next: any) {
  if (req.user.role !== 'KEPALA_KELUARGA') return res.status(403).json({ error: 'Hanya Kepala Keluarga' });
  next();
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), version: '2.0.0', app: 'Finanku Rumah Tangga' });
});

// ──────────────────────────────────────────────
// AUTH — password-based registration & login
// ──────────────────────────────────────────────

// Register new family (creates a new SyncGroup + head user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!username || !password || password.length < 4) return res.status(400).json({ error: 'Username & password (min 4 karakter) wajib diisi' });

    const existing = await prisma.familyUser.findUnique({ where: { code_username: { code: '', username } } }).catch(() => null);
    if (existing) return res.status(400).json({ error: 'Username sudah digunakan' });

    const code = `FAM_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const hashed = await bcrypt.hash(password, 10);

    await prisma.syncGroup.create({
      data: {
        code,
        jwtSecret: JWT_SECRET,
        transactions: encryptData('[]', code),
        buckets: encryptData('[]', code),
        accounts: encryptData('[]', code),
      },
    });

    await prisma.familyUser.create({
      data: { code, username, password: hashed, name: name || username, role: 'KEPALA_KELUARGA' },
    });

    await prisma.familyMember.upsert({
      where: { code_userId: { code, userId: username } },
      update: { role: 'KEPALA_KELUARGA', lastSeen: new Date(), isOnline: true },
      create: { code, userId: username, role: 'KEPALA_KELUARGA' },
    });

    await prisma.chatNotification.create({ data: { code, userId: username, count: 0 } });

    const token = jwt.sign({ code, userId: username, role: 'KEPALA_KELUARGA' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true, token,
      user: { id: username, username, name: name || username, role: 'KEPALA_KELUARGA', family: { code, name: `Keluarga ${name || username}` } },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal registrasi: ' + (err?.message || '') });
  }
});

// Login with username + password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username & password wajib diisi' });

    const user = await prisma.familyUser.findFirst({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Akun tidak ditemukan' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Password salah' });

    await prisma.familyUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await prisma.familyMember.upsert({
      where: { code_userId: { code: user.code, userId: user.username } },
      update: { lastSeen: new Date(), isOnline: true },
      create: { code: user.code, userId: user.username, role: user.role },
    });

    const token = jwt.sign({ code: user.code, userId: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true, token,
      user: {
        id: user.username, username: user.username, name: user.name, role: user.role,
        family: { code: user.code, name: `Keluarga ${user.name}` },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal login' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  const user = await prisma.familyUser.findFirst({ where: { code: req.user.code, username: req.user.userId } });
  res.json({
    id: req.user.userId, username: req.user.userId,
    name: user?.name || req.user.userId,
    role: req.user.role,
    family: { code: req.user.code, name: `Keluarga ${user?.name || req.user.userId}` },
  });
});

app.post('/api/auth/refresh', authenticateToken, (req: any, res) => {
  const token = jwt.sign({ code: req.user.code, userId: req.user.userId, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

app.post('/api/auth/logout', (_req, res) => res.json({ success: true }));

// ──────────────────────────────────────────────
// FAMILY MEMBER MANAGEMENT
// ──────────────────────────────────────────────

// List all family members (users)
app.get('/api/family/members', authenticateToken, async (req: any, res) => {
  const users = await prisma.familyUser.findMany({
    where: { code: req.user.code },
    select: { id: true, username: true, name: true, role: true, createdAt: true, lastLogin: true },
    orderBy: { createdAt: 'asc' },
  });
  const members = await prisma.familyMember.findMany({
    where: { code: req.user.code },
    select: { userId: true, role: true, isOnline: true, lastSeen: true },
  });
  const onlineMap = new Map(members.map(m => [m.userId, { isOnline: m.isOnline, lastSeen: m.lastSeen }]));
  res.json({
    users: users.map(u => ({
      ...u,
      isOnline: onlineMap.get(u.username)?.isOnline || false,
      lastSeen: onlineMap.get(u.username)?.lastSeen || u.lastLogin,
    })),
    onlineCount: members.filter(m => m.isOnline).length,
  });
});

// Head of family adds a new member
app.post('/api/family/members', authenticateToken, isHead, async (req: any, res) => {
  try {
    const { name, role } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama anggota wajib diisi' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Role tidak valid' });

    const username = `anggota_${crypto.randomBytes(3).toString('hex').toLowerCase()}`;
    const plainPassword = crypto.randomBytes(4).toString('hex');
    const hashed = await bcrypt.hash(plainPassword, 10);

    await prisma.familyUser.create({
      data: { code: req.user.code, username, password: hashed, name, role },
    });

    await prisma.familyMember.create({
      data: { code: req.user.code, userId: username, role, isOnline: false },
    });

    await prisma.chatNotification.create({
      data: { code: req.user.code, userId: username, count: 0 },
    });

    await prisma.chatMessage.create({
      data: {
        code: req.user.code,
        senderId: 'SYSTEM',
        senderName: 'Sistem',
        content: `Selamat datang, ${name}! ${req.user.userId} telah menambahkan Anda ke Keluarga.`,
      },
    });

    res.status(201).json({
      success: true,
      member: { username, name, role, plainPassword },
      message: `Anggota "${name}" berhasil ditambahkan. Bagikan username & password ini:`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambah anggota' });
  }
});

// Update member role
app.put('/api/family/members/:username', authenticateToken, isHead, async (req: any, res) => {
  try {
    const { role, name } = req.body;
    const data: any = {};
    if (role && VALID_ROLES.includes(role)) data.role = role;
    if (name) data.name = name;
    await prisma.familyUser.updateMany({ where: { code: req.user.code, username: req.params.username }, data });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Gagal update anggota' }); }
});

// Remove member
app.delete('/api/family/members/:username', authenticateToken, isHead, async (req: any, res) => {
  try {
    await prisma.familyUser.deleteMany({ where: { code: req.user.code, username: req.params.username } });
    await prisma.familyMember.deleteMany({ where: { code: req.user.code, userId: req.params.username } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Gagal hapus anggota' }); }
});

// ──────────────────────────────────────────────
// CHAT SYSTEM
// ──────────────────────────────────────────────

// Send a chat message
app.post('/api/chat/messages', authenticateToken, async (req: any, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

    const user = await prisma.familyUser.findFirst({ where: { code: req.user.code, username: req.user.userId } });
    const msg = await prisma.chatMessage.create({
      data: {
        code: req.user.code,
        senderId: req.user.userId,
        senderName: user?.name || req.user.userId,
        content: content.trim(),
      },
    });

    // Update unread count for all other members
    const allUsers = await prisma.familyUser.findMany({ where: { code: req.user.code }, select: { username: true } });
    for (const u of allUsers) {
      if (u.username !== req.user.userId) {
        await prisma.chatNotification.upsert({
          where: { code_userId: { code: req.user.code, userId: u.username } },
          update: { count: { increment: 1 } },
          create: { code: req.user.code, userId: u.username, count: 1 },
        });
      }
    }

    res.status(201).json({ success: true, message: msg });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal kirim pesan' });
  }
});

// Get chat messages (paginated, newest first)
app.get('/api/chat/messages', authenticateToken, async (req: any, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const before = req.query.before as string;

  const where: any = { code: req.user.code };
  if (before) where.createdAt = { lt: new Date(before) };

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const total = await prisma.chatMessage.count({ where: { code: req.user.code } });

  res.json({ messages: messages.reverse(), total });
});

// Mark messages as read
app.post('/api/chat/read', authenticateToken, async (req: any, res) => {
  await prisma.chatNotification.upsert({
    where: { code_userId: { code: req.user.code, userId: req.user.userId } },
    update: { count: 0, lastRead: new Date() },
    create: { code: req.user.code, userId: req.user.userId, count: 0 },
  });
  res.json({ success: true });
});

// Get unread count
app.get('/api/chat/unread', authenticateToken, async (req: any, res) => {
  const notif = await prisma.chatNotification.findUnique({
    where: { code_userId: { code: req.user.code, userId: req.user.userId } },
  });
  res.json({ unread: notif?.count || 0, lastRead: notif?.lastRead || new Date(0).toISOString() });
});

// ──────────────────────────────────────────────
// EXISTING SYNC ENDPOINTS (unchanged)
// ──────────────────────────────────────────────

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
    res.status(500).json({ error: 'Gagal bergabung ke grup' });
  }
});

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
  } catch { res.status(500).json({ error: 'Gagal memperbarui data' }); }
});

app.get('/api/sync/pull', authenticateToken, async (req: any, res) => {
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
});

// ──────────────────────────────────────────────
// EXISTING CRUD ENDPOINTS (unchanged)
// ──────────────────────────────────────────────

app.get('/api/accounts', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  res.json(group ? JSON.parse(decryptData(group.accounts, req.user.code)) : []);
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

app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  res.json(group ? JSON.parse(decryptData(group.transactions, req.user.code)) : []);
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

app.get('/api/buckets', authenticateToken, async (req: any, res) => {
  const group = await prisma.syncGroup.findUnique({ where: { code: req.user.code } });
  res.json(group ? JSON.parse(decryptData(group.buckets, req.user.code)) : []);
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

app.get('/api/goals', (_req, res) => res.json({ goals: [] }));
app.post('/api/goals', (req, res) => res.status(201).json({ success: true, goal: { id: 'goal-' + Date.now(), ...req.body, currentAmount: 0, createdAt: new Date().toISOString() } }));
app.put('/api/goals/:id', (_req, res) => res.json({ success: true }));
app.delete('/api/goals/:id', (_req, res) => res.json({ success: true }));

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

app.get('/api/notifications', (_req, res) => res.json({ notifications: [] }));
app.get('/api/audit-logs', authenticateToken, async (req: any, res) => {
  const logs = await prisma.auditLog.findMany({ where: { code: req.user.code }, orderBy: { timestamp: 'desc' }, take: 100 });
  res.json({ logs });
});

export default app;
