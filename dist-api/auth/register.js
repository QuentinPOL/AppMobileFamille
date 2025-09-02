"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handler;
const prisma_1 = require("@/api/_lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
exports.config = {
    runtime: 'nodejs20.x',
};
const ALLOWED_ORIGINS = [
    'http://localhost:3000', // vercel dev
    'http://localhost:8081', // expo devtools
    'http://localhost:19006', // expo web
    'http://127.0.0.1:3000',
];
// CORS util
function setCors(res, origin) {
    const allow = origin &&
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
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalide').max(255),
    password: zod_1.z.string().min(8, 'Mot de passe trop court (min 8)').max(256),
    name: zod_1.z.string().min(1).max(100).optional(),
});
async function readJsonBody(req) {
    // Si body déjà parsé par Vercel/Express
    if (req.body && typeof req.body === 'object')
        return req.body;
    // Si body est une string
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        }
        catch {
            return {};
        }
    }
    // Sinon on lit le flux brut
    const chunks = [];
    for await (const c of req)
        chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        console.error('❌ Body JSON invalide:', raw.slice(0, 200));
        return {};
    }
}
async function handler(req, res) {
    const origin = req.headers?.origin ?? null;
    setCors(res, origin);
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.json({ error: 'Method not allowed' });
    }
    try {
        const body = await readJsonBody(req);
        const parsed = RegisterSchema.safeParse({
            email: String(body.email || '').trim().toLowerCase(),
            password: String(body.password || ''),
            name: body.name ? String(body.name).trim() : undefined,
        });
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid payload',
                details: parsed.error.flatten(),
            });
        }
        const { email, password, name } = parsed.data;
        const exists = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (exists) {
            return res.status(409).json({ error: 'Email déjà utilisé' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash, name },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        return res.status(201).json({ success: true, user });
    }
    catch (err) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'Email déjà utilisé' });
        }
        console.error('❌ Register error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
