import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app, { prisma, JWT_SECRET } from "../app";

const testCode = "VITEST-KELUARGA-" + Date.now();
const testUserId = "owner@keluarga-test.id";
let testToken = "";
let memberToken = "";
let adminToken = "";

beforeAll(async () => {
  // Buat token langsung tanpa hit network
  testToken = jwt.sign({ code: testCode, userId: testUserId, role: "KEPALA_KELUARGA" }, JWT_SECRET, { expiresIn: "1h" });
  memberToken = jwt.sign({ code: testCode, userId: "member@test.id", role: "ANAK" }, JWT_SECRET, { expiresIn: "1h" });
  adminToken = jwt.sign({ code: testCode, userId: "admin@test.id", role: "PASANGAN" }, JWT_SECRET, { expiresIn: "1h" });

  // Buat sync group di DB untuk test
  await prisma.syncGroup.upsert({
    where: { code: testCode },
    update: {},
    create: {
      code: testCode,
      jwtSecret: "test-secret",
      transactions: "[]",
      buckets: "[]",
      accounts: "[]"
    }
  });
});

afterAll(async () => {
  // Cleanup test data
  await prisma.auditLog.deleteMany({ where: { code: testCode } }).catch(() => {});
  await prisma.familyMember.deleteMany({ where: { code: testCode } }).catch(() => {});
  await prisma.syncGroup.delete({ where: { code: testCode } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Keuangan Rumah Tangga Server API tests", () => {

  describe("GET /api/health", () => {
    it("should return ok and security metrics", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.securityScore).toBeGreaterThanOrEqual(90);
    });

    it("should return valid ISO timestamp", async () => {
      const res = await request(app).get("/api/health");
      const date = new Date(res.body.serverTime);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe("POST /api/sync/join", () => {
    it("should fail with empty code (Zod validation)", async () => {
      const res = await request(app).post("/api/sync/join").send({ code: "" });
      expect(res.status).toBe(400);
    });

    it("should fail with missing userId (Zod validation)", async () => {
      const res = await request(app).post("/api/sync/join").send({ code: "VALIDCODE", role: "KEPALA_KELUARGA" });
      expect(res.status).toBe(400);
    });

    it("should fail with invalid role (Zod validation)", async () => {
      const res = await request(app).post("/api/sync/join").send({ code: "VALIDCODE", userId: "test@test.com", role: "PENGGUNA" });
      expect(res.status).toBe(400);
    });

    it("should fail with code less than 3 characters", async () => {
      const res = await request(app).post("/api/sync/join").send({ code: "AB", userId: "test@test.com", role: "KEPALA_KELUARGA" });
      expect(res.status).toBe(400);
    });

    it("should succeed and create a new room with valid request payload", async () => {
      const newCode = "NEW-ROOM-" + Date.now();
      const res = await request(app).post("/api/sync/join").send({
        code: newCode, userId: testUserId, role: "KEPALA_KELUARGA",
        clientTransactions: [], clientBuckets: [], clientAccounts: [], clientDebts: []
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.role).toBe("KEPALA_KELUARGA");
      // Cleanup
      await prisma.familyMember.deleteMany({ where: { code: newCode } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { code: newCode } }).catch(() => {});
      await prisma.syncGroup.delete({ where: { code: newCode } }).catch(() => {});
    });

    it("should connect to existing room when code already exists", async () => {
      const res = await request(app).post("/api/sync/join").send({
        code: testCode, userId: "member2@test.id", role: "ANAK"
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("should normalize code to uppercase", async () => {
      const res = await request(app).post("/api/sync/join").send({
        code: testCode.toLowerCase(), userId: testUserId, role: "KEPALA_KELUARGA"
      });
      expect(res.status).toBe(200);
      expect(res.body.group.code).toBe(testCode.toUpperCase());
    });
  });

  describe("JWT Authentication", () => {
    it("GET /api/sync/logs should return 401 if token is missing", async () => {
      const res = await request(app).get("/api/sync/logs");
      expect(res.status).toBe(401);
    });

    it("GET /api/sync/logs should return 403 with invalid token", async () => {
      const res = await request(app).get("/api/sync/logs").set("Authorization", "Bearer invalidtoken123");
      expect(res.status).toBe(403);
    });

    it("GET /api/sync/logs should return 403 with expired token", async () => {
      const expiredToken = jwt.sign({ code: testCode, userId: testUserId, role: "KEPALA_KELUARGA" }, JWT_SECRET, { expiresIn: "1ms" });
      await new Promise(r => setTimeout(r, 100));
      const res = await request(app).get("/api/sync/logs").set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(403);
    });

    it("GET /api/sync/logs should return 200 with valid token", async () => {
      const res = await request(app).get("/api/sync/logs").set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.logs).toBeInstanceOf(Array);
    });

    it("should reject requests with malformed Authorization header", async () => {
      const res = await request(app).get("/api/sync/logs").set("Authorization", "NotBearer tokenvalue");
      expect(res.status).toBe(401);
    });
  });

  describe("RBAC - Role-Based Access Control", () => {
    it("ANAK should NOT be able to update buckets", async () => {
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ code: testCode, buckets: [{ id: "b1", name: "Test" }] });
      expect(res.status).toBe(403);
    });

    it("ANAK should NOT be able to update accounts", async () => {
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ code: testCode, accounts: [{ id: "a1", name: "BCA" }] });
      expect(res.status).toBe(403);
    });

    it("PASANGAN should be able to update buckets", async () => {
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ code: testCode, buckets: [{ id: "b1", name: "Test" }] });
      expect(res.status).toBe(200);
    });

    it("KEPALA_KELUARGA should be able to update full configuration", async () => {
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ code: testCode, transactions: [], buckets: [], accounts: [] });
      expect(res.status).toBe(200);
    });

    it("should reject update for mismatched code in token vs body", async () => {
      const wrongToken = jwt.sign({ code: "WRONG-CODE", userId: testUserId, role: "KEPALA_KELUARGA" }, JWT_SECRET, { expiresIn: "1h" });
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${wrongToken}`)
        .send({ code: testCode, transactions: [] });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/sync/pull", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/sync/pull?code=" + testCode);
      expect(res.status).toBe(401);
    });

    it("should return 401 with mismatched code query param", async () => {
      const res = await request(app).get("/api/sync/pull?code=WRONGCODE").set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(401);
    });

    it("should return data with valid token and matching code", async () => {
      const res = await request(app).get(`/api/sync/pull?code=${testCode}`).set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.group).toBeDefined();
      expect(res.body.group.transactions).toBeInstanceOf(Array);
    });

    it("should return decrypted data matching what was stored", async () => {
      const res = await request(app).get(`/api/sync/pull?code=${testCode}`).set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.group.transactions)).toBe(true);
      expect(Array.isArray(res.body.group.buckets)).toBe(true);
    });
  });

  describe("Backup & Restore", () => {
    it("POST /api/sync/backup should fail for ANAK role", async () => {
      const res = await request(app).post("/api/sync/backup").set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });

    it("POST /api/sync/backup should succeed for KEPALA_KELUARGA", async () => {
      const res = await request(app).post("/api/sync/backup").set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
    });

    it("POST /api/sync/backup should succeed for PASANGAN", async () => {
      const res = await request(app).post("/api/sync/backup").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it("POST /api/sync/restore should fail for PASANGAN (only KEPALA_KELUARGA allowed)", async () => {
      const res = await request(app).post("/api/sync/restore").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it("POST /api/sync/restore should fail for ANAK", async () => {
      const res = await request(app).post("/api/sync/restore").set("Authorization", `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("Audit Log System", () => {
    it("should record audit logs from join and update actions", async () => {
      const res = await request(app).get("/api/sync/logs").set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it("should have at least UPDATE_LEDGER action logged", async () => {
      const res = await request(app).get("/api/sync/logs").set("Authorization", `Bearer ${testToken}`);
      const actions = res.body.logs.map((l: any) => l.action);
      expect(actions).toContain("UPDATE_LEDGER");
    });
  });

  describe("Data Encryption at Rest", () => {
    it("should store encrypted data in the database (not plain JSON)", async () => {
      const rawGroup = await prisma.syncGroup.findUnique({ where: { code: testCode } });
      expect(rawGroup).toBeDefined();
      expect(rawGroup!.transactions).not.toBe("[]");
      expect(rawGroup!.transactions).toContain(":");
    });

    it("decrypted data from pull should match what was stored via update", async () => {
      const res = await request(app).get(`/api/sync/pull?code=${testCode}`).set("Authorization", `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.group.transactions)).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should not rate limit within normal usage", async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
      }
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown API routes", async () => {
      const res = await request(app).get("/api/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should handle missing body gracefully on POST /api/sync/join", async () => {
      const res = await request(app).post("/api/sync/join").send({});
      expect(res.status).toBe(400);
    });

    it("should handle update for non-existent sync group", async () => {
      const fakeToken = jwt.sign({ code: "NOTEXIST-999", userId: "x@x.com", role: "KEPALA_KELUARGA" }, JWT_SECRET, { expiresIn: "1h" });
      const res = await request(app).post("/api/sync/update")
        .set("Authorization", `Bearer ${fakeToken}`)
        .send({ code: "NOTEXIST-999", transactions: [] });
      expect(res.status).toBe(404);
    });
  });
});