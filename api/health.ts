import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    securityScore: 95,
    serverTime: new Date().toISOString(),
    version: "1.0.0",
    app: "Finanku Rumah Tangga",
  });
}
