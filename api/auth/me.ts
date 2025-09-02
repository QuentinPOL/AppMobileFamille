import { prisma } from '@/api/_lib/prisma';
import jwt from 'jsonwebtoken';

function setCors(res: any, origin: string | null) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin ?? null;
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.json({ erreur: 'Méthode non autorisée' });
  }

  try {
    const auth = String(req.headers['authorization'] || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ erreur: 'Jeton manquant' });
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ erreur: 'Jeton invalide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ erreur: 'Utilisateur introuvable' });
    }

    return res.status(200).json({ utilisateur: user });
  } catch (err) {
    console.error('❌ Erreur interne:', err);
    return res.status(500).json({ erreur: 'Erreur interne du serveur' });
  }
}