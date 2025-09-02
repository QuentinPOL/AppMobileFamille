# CONTEXT.md

## 📂 Arborescence détaillée du projet

├── app/                         # App Expo (RN + Router)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Exemple d’onglet
│   │   └── explore.tsx          # Deuxième onglets
│   ├── _providers/
│   │   └── AuthProvider.tsx     # Contexte d’auth (token, /me, authFetch, signIn/Out)
│   ├── _layout.tsx              # Layout racine + guard d’auth
│   ├── login.tsx                # Écran de connexion (useAuth().signIn)
│   ├── register.tsx             # Écran d’inscription (validation + auto-login)
│   └── +not-found.tsx
│
├── api/                         # API (dev: Express, prod: Serverless Vercel)
│   ├── index.ts                 # DEV ONLY (Express local sur :3001)
│   ├── _lib/
│   │   └── prisma.ts            # PrismaClient (singleton global)
│   └── auth/
│       ├── register.ts          # POST /api/auth/register (422 fieldErrors, 409 si email)
│       ├── login.ts             # POST /api/auth/login (JWT 7j)
│       └── me.ts                # GET  /api/auth/me (check Bearer)
│
├── prisma/
│   ├── schema.prisma            # Modèle User { id, email, passwordHash, name, createdAt… }
│   └── migrations/              # Migrations Prisma
│
├── assets/
│   ├── images/                  # icon.png, adaptive-icon.png, splash-icon.png, favicon.png
│   └── pwa/                     # icon-192/512 (+ variantes maskable/mono possibles)
│
├── public/
│   └── service-worker.js        # SW PWA (cache + auto-update, skipWaiting)
│
├── scripts/
│   ├── reset-project.js
│   └── after-export.js          # Injecte manifest + copie SW + icons PWA dans dist/
│
├── dist/  et dist-api/          # (build web) Expo export static → servi par Vercel
│
├── .env                         # Local (EXPO_PUBLIC_API_URL, DB, JWT_SECRET…)
├── app.json                     # Config Expo (iOS/Android/Web/PWA)
├── vercel.json                  # Build web + headers PWA
├── package.json                 # Déps + scripts (concurrently, tsx, prisma…)
├── tsconfig.json                # TS strict + alias "@/..."
└── tsconfig.api.json            # TS côté API (si compilation dédiée)

---

## ⚙️ Pile technique

- **Expo 53 + React 19 + RN 0.79 + Expo Router 5**
- **TypeScript 5.8 (strict)**, alias `@/*`
- **Auth côté app** : `AuthProvider` (SecureStore, /me, authFetch)
- **Auth côté API** : `register`, `login` (JWT HS256 7j), `me`
- **DB** : Prisma Client (singleton), migrations Prisma
- **PWA** : export web statique, manifest+SW injectés (auto-update)
- **Dev local** :
  - App : `npm run dev:app` (ou `npm run dev`)
  - API : `npm run dev:api` (Express via `tsx`, port **3001**)
- **Prod Vercel** :
  - Web statique depuis **dist/**
  - API **serverless** via `api/auth/*.ts` (pas d’Express en prod)

---

## 🔗 Endpoints principaux

- `POST /api/auth/register` → crée l’utilisateur, renvoie `201 { user }` ou `422 { fieldErrors }` / `409`
- `POST /api/auth/login` → renvoie `200 { token, user }` (JWT 7j)
- `GET  /api/auth/me`     → renvoie `200 { user }` si Bearer valide

---

## 📱 App & Auth (résumé)

- Login/Register pré-validés (Zod), affichage des erreurs par champ.
- `AuthProvider` :
  - persiste le token (SecureStore),
  - réhydrate au boot avec `/api/auth/me`,
  - expose `signIn`, `signOut`,
  - expose `authFetch(path, init)` qui préfixe l’URL et ajoute `Authorization: Bearer …`.
- `_layout.tsx` redirige auto vers `/login` si non connecté, sinon `/(tabs)`.

---