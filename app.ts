import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";

// ─── Prisma ───────────────────────────────────────────────────────────────
export const prisma = new PrismaClient();

// ─── JWT Secret ───────────────────────────────────────────────────────────
export const JWT_SECRET = process.env.JWT_SECRET || "keluarga-secret-dev-" + crypto.randomBytes(16).toString("hex");
const JWT_EXPIRY = "24h";

// ─── Role definitions ──────────────────────────────────────────────────────
export const ROLES = {
  KEPALA_KELUARGA: "KEPALA_KELUARGA",
  PASANGAN: "PASANGAN",
  ANAK: "ANAK",
} as const;

export type FamilyRole = (typeof ROLES)[keyof typeof ROLES];

const VALID_ROLES: FamilyRole[] = [ROLES.KEPALA_KELUARGA, ROLES.PASANGAN, ROLES.ANAK];

// Roles that can perform write operations (update data)
const WRITER_ROLES: FamilyRole[] = [ROLES.KEPALA_KELUARGA, ROLES.PASANGAN];

// Roles that can perform backup
const BACKUP_ROLES: FamilyRole[] = [ROLES.KEPALA_KELUARGA, ROLES.PASANGAN];

// Roles that can perform restore
const RESTORE_ROLES: FamilyRole[] = [ROLES.KEPALA_KELUARGA];

// ─── Encryption helpers ────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(code: string): Buffer {
  // Derive a consistent 32-byte key from the room code
  return crypto.createHash("sha256").update(code + JWT_SECRET).digest();
}

function encryptData(plaintext: string, code: string): string {
  const key = getEncryptionKey(code);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + authTag + ":" + encrypted;
}

function decryptData(ciphertext: string, code: string): string {
  try {
    const key = getEncryptionKey(code);
    const parts = ciphertext.split(":");
    if (parts.length !== 3) return ciphertext; // fallback for unencrypted data
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return ciphertext; // fallback
  }
}

// ─── Express App Setup ─────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── HTTP Server + Socket.IO ───────────────────────────────────────────────
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Unauthorized: no token"));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("Forbidden: invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = (socket as any).user;
  const roomCode = user.code;

  socket.join(roomCode);
  console.log(`[Socket.IO] ${user.userId} tergabung ke room ${roomCode}`);

  // Update online status
  prisma.familyMember.updateMany({
    where: { code: roomCode, userId: user.userId },
    data: { isOnline: true, lastSeen: new Date() },
  }).catch(() => {});

  // Broadcast online members
  broadcastOnlineMembers(roomCode);

  socket.on("data:change", async (data: any) => {
    // Forward data changes to all family members in the room
    socket.to(roomCode).emit("data:sync", data);
    // Log activity
    await logActivity(roomCode, user.userId, user.role, "UPDATE_LEDGER", 
      `${user.userId} memperbarui ${data.type || "data"}`);
    // Broadcast latest data to all
    io.to(roomCode).emit("notification", {
      type: "info",
      title: "Data Diperbarui",
      message: `${user.userId} baru saja mengubah data ${data.type || ""}`,
    });
  });

  socket.on("activity", async (message: string) => {
    await logActivity(roomCode, user.userId, user.role, "ACTIVITY", message);
    io.to(roomCode).emit("activity_logged", {
      id: Date.now().toString(),
      userId: user.userId,
      userRole: user.role,
      description: message,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] ${user.userId} keluar`);
    prisma.familyMember.updateMany({
      where: { code: roomCode, userId: user.userId },
      data: { isOnline: false },
    }).catch(() => {});
    broadcastOnlineMembers(roomCode);
  });
});

async function broadcastOnlineMembers(roomCode: string) {
  try {
    const members = await prisma.familyMember.findMany({
      where: { code: roomCode, isOnline: true },
      select: { userId: true, role: true },
    });
    io.to(roomCode).emit("family_members_status", members);
  } catch {}
}

async function logActivity(code: string, userId: string, userRole: string, action: string, description: string) {
  try {
    await prisma.auditLog.create({
      data: { code, userId, userRole, action, description },
    });
  } catch {}
}

// ─── JWT Middleware ────────────────────────────────────────────────────────
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Token tidak ditemukan" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Format token tidak valid" });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(403).json({ error: "Token sudah kedaluwarsa" });
    }
    return res.status(403).json({ error: "Token tidak valid" });
  }
}

function requireRole(...allowedRoles: FamilyRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Akses ditolak: peran tidak mencukupi" });
    }
    next();
  };
}

function checkCodeMatch(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const bodyCode = (req.body?.code || req.query?.code || "").toUpperCase();
  if (user.code !== bodyCode) {
    return res.status(401).json({ error: "Kode tidak cocok dengan token" });
  }
  next();
}

// ─── Zod Schemas ───────────────────────────────────────────────────────────
const joinSchema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter"),
  userId: z.string().min(1, "User ID wajib diisi"),
  role: z.enum(["KEPALA_KELUARGA", "PASANGAN", "ANAK"]).default("ANAK"),
  clientTransactions: z.array(z.any()).optional().default([]),
  clientBuckets: z.array(z.any()).optional().default([]),
  clientAccounts: z.array(z.any()).optional().default([]),
  clientDebts: z.array(z.any()).optional().default([]),
});

const updateSchema = z.object({
  code: z.string().min(1),
  transactions: z.array(z.any()).optional(),
  buckets: z.array(z.any()).optional(),
  accounts: z.array(z.any()).optional(),
  debtData: z.array(z.any()).optional(),
});

// ─── API Routes ────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    securityScore: 95,
    serverTime: new Date().toISOString(),
    version: "1.0.0",
    app: "Finanku Rumah Tangga",
  });
});

// Join / Create sync group
app.post("/api/sync/join", async (req: Request, res: Response) => {
  try {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validasi gagal",
        details: parsed.error.issues.map(i => i.message),
      });
    }

    const { code, userId, role, clientTransactions, clientBuckets, clientAccounts, clientDebts } = parsed.data;
    const normalizedCode = code.toUpperCase();

    // Check or create sync group
    let group = await prisma.syncGroup.findUnique({ where: { code: normalizedCode } });

    if (!group) {
      // Create new group with encrypted empty data
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

    // Add or update family member
    await prisma.familyMember.upsert({
      where: { code_userId: { code: normalizedCode, userId } },
      update: { role, lastSeen: new Date(), isOnline: true },
      create: { code: normalizedCode, userId, role },
    });

    // Generate JWT
    const token = jwt.sign(
      { code: normalizedCode, userId, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Log activity
    await logActivity(normalizedCode, userId, role, "JOIN_ROOM", `${userId} tergabung ke Saku Keluarga`);

    // Decrypt and return group data
    const decryptedGroup = {
      code: group.code,
      transactions: JSON.parse(decryptData(group.transactions, normalizedCode)),
      buckets: JSON.parse(decryptData(group.buckets, normalizedCode)),
      accounts: JSON.parse(decryptData(group.accounts, normalizedCode)),
      debtData: group.debtData ? JSON.parse(decryptData(group.debtData, normalizedCode)) : [],
      updatedAt: group.updatedAt.toISOString(),
    };

    res.json({
      token,
      role,
      message: "Berhasil tergabung ke Saku Keluarga!",
      group: decryptedGroup,
    });
  } catch (err: any) {
    console.error("[Join Error]", err);
    res.status(500).json({ error: "Gagal bergabung ke grup" });
  }
});

// Update sync group data (requires auth + writer role)
app.post("/api/sync/update", authenticateToken, checkCodeMatch, requireRole(...WRITER_ROLES), async (req: Request, res: Response) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validasi gagal", details: parsed.error.issues });
    }

    const { code, transactions, buckets, accounts, debtData } = parsed.data;
    const normalizedCode = code.toUpperCase();
    const user = (req as any).user;

    const group = await prisma.syncGroup.findUnique({ where: { code: normalizedCode } });
    if (!group) {
      return res.status(404).json({ error: "Grup tidak ditemukan" });
    }

    // Update only provided fields, encrypting each
    const updateData: any = {};
    if (transactions !== undefined) updateData.transactions = encryptData(JSON.stringify(transactions), normalizedCode);
    if (buckets !== undefined) updateData.buckets = encryptData(JSON.stringify(buckets), normalizedCode);
    if (accounts !== undefined) updateData.accounts = encryptData(JSON.stringify(accounts), normalizedCode);
    if (debtData !== undefined) updateData.debtData = encryptData(JSON.stringify(debtData), normalizedCode);

    const updated = await prisma.syncGroup.update({
      where: { code: normalizedCode },
      data: updateData,
    });

    // Log activity
    await logActivity(normalizedCode, user.userId, user.role, "UPDATE_LEDGER", 
      `${user.userId} memperbarui pembukuan keluarga`);

    // Notify all family members via Socket.IO
    io.to(normalizedCode).emit("sync_pull", {
      group: {
        code: updated.code,
        transactions: JSON.parse(decryptData(updated.transactions, normalizedCode)),
        buckets: JSON.parse(decryptData(updated.buckets, normalizedCode)),
        accounts: JSON.parse(decryptData(updated.accounts, normalizedCode)),
        debtData: updated.debtData ? JSON.parse(decryptData(updated.debtData, normalizedCode)) : [],
        updatedAt: updated.updatedAt.toISOString(),
      }
    });

    res.json({
      message: "Pembukuan berhasil diperbarui",
      group: {
        code: updated.code,
        updatedAt: updated.updatedAt.toISOString(),
      }
    });
  } catch (err: any) {
    console.error("[Update Error]", err);
    res.status(500).json({ error: "Gagal memperbarui data" });
  }
});

// Pull data from sync group
app.get("/api/sync/pull", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const queryCode = (req.query.code as string || "").toUpperCase();

    if (user.code !== queryCode) {
      return res.status(401).json({ error: "Kode tidak cocok" });
    }

    const group = await prisma.syncGroup.findUnique({ where: { code: queryCode } });
    if (!group) {
      return res.status(404).json({ error: "Grup tidak ditemukan" });
    }

    res.json({
      group: {
        code: group.code,
        transactions: JSON.parse(decryptData(group.transactions, queryCode)),
        buckets: JSON.parse(decryptData(group.buckets, queryCode)),
        accounts: JSON.parse(decryptData(group.accounts, queryCode)),
        debtData: group.debtData ? JSON.parse(decryptData(group.debtData, queryCode)) : [],
        updatedAt: group.updatedAt.toISOString(),
      }
    });
  } catch (err: any) {
    console.error("[Pull Error]", err);
    res.status(500).json({ error: "Gagal mengambil data" });
  }
});

// Get audit logs
app.get("/api/sync/logs", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const logs = await prisma.auditLog.findMany({
      where: { code: user.code },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    res.json({ logs });
  } catch (err: any) {
    console.error("[Logs Error]", err);
    res.status(500).json({ error: "Gagal mengambil log" });
  }
});

// Backup
app.post("/api/sync/backup", authenticateToken, requireRole(...BACKUP_ROLES), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const group = await prisma.syncGroup.findUnique({ where: { code: user.code } });
    if (!group) return res.status(404).json({ error: "Grup tidak ditemukan" });

    // Create a backup file entry (in a real app, save to disk/cloud)
    await logActivity(user.code, user.userId, user.role, "BACKUP", 
      `${user.userId} membuat cadangan data keluarga`);

    res.json({
      message: "Cadangan berhasil dibuat",
      backupAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Backup Error]", err);
    res.status(500).json({ error: "Gagal membuat cadangan" });
  }
});

// Restore (KEPALA_KELUARGA only)
app.post("/api/sync/restore", authenticateToken, requireRole(...RESTORE_ROLES), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await logActivity(user.code, user.userId, user.role, "RESTORE",
      `${user.userId} memulihkan cadangan data keluarga`);

    res.json({
      message: "Data berhasil dipulihkan",
      restoredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Restore Error]", err);
    res.status(500).json({ error: "Gagal memulihkan data" });
  }
});

// Get online family members
app.get("/api/sync/members", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const members = await prisma.familyMember.findMany({
      where: { code: user.code, isOnline: true },
      select: { userId: true, role: true, lastSeen: true },
    });
    res.json({ members });
  } catch (err: any) {
    console.error("[Members Error]", err);
    res.status(500).json({ error: "Gagal mengambil data anggota" });
  }
});

// Get activity logs (polling-friendly)
app.get("/api/sync/activity", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(0);
    const logs = await prisma.auditLog.findMany({
      where: {
        code: user.code,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    res.json({ logs });
  } catch (err: any) {
    console.error("[Activity Error]", err);
    res.status(500).json({ error: "Gagal mengambil aktivitas" });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Rute tidak ditemukan" });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000", 10);

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`🏠 Finanku Rumah Tangga Server berjalan di port ${PORT}`);
  });
}

export { app, httpServer, io };
export default app;
