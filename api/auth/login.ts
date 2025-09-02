import { prisma } from '@/api/_lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:3000',
];

function setCors(res: any, origin: string | null) {
  const allow =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('https://'));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', allow ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

const LoginSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Mot de passe trop court (min 8)').max(256),
});

async function readJsonBody(req: any) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks: Uint8Array[] = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin ?? null;
  setCors(res, origin);

  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST, OPTIONS');
    return res.json({ error: 'Méthodes non autorisées' });
  }

  try {
    const body = await readJsonBody(req);
    const parsed = LoginSchema.safeParse({
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
    });
    if (!parsed.success) {
      const { fieldErrors, formErrors } = parsed.error.flatten();
      return res.status(422).json({ error: 'Validation echouée', fieldErrors, formErrors });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, createdAt: true }
    });

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET manquant');
      return res.status(500).json({ error: 'Bug de configuration serveur' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '30d' });
    const safeUser = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };

    return res.status(200).json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'ERREUR SERVEUR' });
  }
}