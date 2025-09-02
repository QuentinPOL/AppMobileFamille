import { prisma } from '@/api/_lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const config = {
  runtime: 'nodejs20.x',
};

const ALLOWED_ORIGINS = [
  'http://localhost:3000', // vercel dev
  'http://localhost:8081', // expo devtools
  'http://localhost:19006', // expo web
  'http://127.0.0.1:3000',
];

// --- CORS ---
function setCors(res: any, origin: string | null) {
  const allow =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.startsWith('http://192.168.') || // LAN
      origin.startsWith('https://')); // prod

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', allow ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

// --- Validation avec Zod ---
const RegisterSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)').max(256),
  name: z.string().min(1, 'Nom trop court').max(100, 'Nom trop long').optional(),
});

// --- Body parser ---
async function readJsonBody(req: any) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks: Uint8Array[] = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();

  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.error('❌ Body JSON invalide:', raw.slice(0, 200));
    return {};
  }
}

// --- Handler principal ---
export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin ?? null;
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.json({ erreur: 'Méthode non autorisée' });
  }

  try {
    const body = await readJsonBody(req);

    const parsed = RegisterSchema.safeParse({
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
      name: body.name ? String(body.name).trim() : undefined,
    });

    if (!parsed.success) {
      const { fieldErrors, formErrors } = parsed.error.flatten();
      return res.status(422).json({
        erreur: 'La validation a échoué',
        erreursChamps: fieldErrors,  // { email?: string[], password?: string[], name?: string[] }
        erreursFormulaire: formErrors,   // string[]
      });
    }

    const { email, password, name } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return res.status(201).json({ succes: true, utilisateur: user });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ erreur: 'Cet email est déjà utilisé' });
    }
    console.error('❌ Erreur lors de l’inscription:', err);
    return res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
}