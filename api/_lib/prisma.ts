// api/_lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global { var __prisma__: PrismaClient | undefined }

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query','error','warn'],
  });

if (process.env.NODE_ENV !== 'production') global.__prisma__ = prisma;
