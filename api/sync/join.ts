import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'finanku-keluarga-secret-2026';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, userId, role = 'ANGGOTA', clientTransactions = [], clientBuckets = [], clientAccounts = [], clientDebts = [] } = req.body;

    if (!code || code.length < 3) {
      return res.status(400).json({ error: 'Kode minimal 3 karakter' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID wajib diisi' });
    }

    const validRoles = ['KEPALA_KELUARGA', 'PASANGAN', 'ANAK'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }

    const normalizedCode = code.toUpperCase();

    let group = await prisma.syncGroup.findUnique({ where: { code: normalizedCode } });

    if (!group) {
      group = await prisma.syncGroup.create({
        data: {
          code: normalizedCode,
          jwtSecret: JWT_SECRET,
          transactions: encryptData(JSON.stringify(clientTransactions), normalizedCode),
          buckets: encryptData(JSON.stringify(clientBuckets), normalizedCode),
          accounts: encryptData(JSON.stringify(clientAccounts), normalizedCode),
          debtData: encryptData(JSON.stringify(clientDebts), normalizedCode),
        },
      });
    }

    await prisma.familyMember.upsert({
      where: { code_userId: { code: normalizedCode, userId } },
      update: { role, lastSeen: new Date(), isOnline: true },
      create: { code: normalizedCode, userId, role },
    });

    const token = jwt.sign(
      { code: normalizedCode, userId, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await prisma.auditLog.create({
      data: { code: normalizedCode, userId, userRole: role, action: 'JOIN_ROOM', description: `${userId} tergabung ke Saku Keluarga` },
    }).catch(() => {});

    const decryptedGroup = {
      code: group.code,
      transactions: JSON.parse(decryptData(group.transactions, normalizedCode)),
      buckets: JSON.parse(decryptData(group.buckets, normalizedCode)),
      accounts: JSON.parse(decryptData(group.accounts, normalizedCode)),
      debtData: group.debtData ? JSON.parse(decryptData(group.debtData, normalizedCode)) : [],
      updatedAt: group.updatedAt.toISOString(),
    };

    return res.status(200).json({
      token,
      role,
      message: 'Berhasil tergabung ke Saku Keluarga!',
      group: decryptedGroup,
    });
  } catch (err: any) {
    console.error('[Join Error]', err);
    return res.status(500).json({ error: 'Gagal bergabung ke grup' });
  }
}
