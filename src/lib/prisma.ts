import { PrismaClient } from '@prisma/client';

// A single shared PrismaClient for the whole app. Every route file previously
// did its own `new PrismaClient()`, which meant ~33 separate connection pools
// against a direct (non-pooled) Postgres connection — easily exhausting
// Supabase's connection limit after a few dev-server restarts ("Too many
// database connections opened"). One shared client fixes that.
//
// In dev, ts-node-dev's hot-reload can re-execute this module multiple times
// per process; stashing the client on `global` survives that and avoids
// creating a fresh pool on every file change.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
