import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let client: PrismaClient;

const pool = buildPoolConfig();

function generateNewPrismaClient(): PrismaClient {
  getPrismaClient();
  return client;
}

function getPrismaClient() {
  if (client) {
    return client;
  }
  const adapter = new PrismaPg(pool);
  client = new PrismaClient({ adapter });
}

export default generateNewPrismaClient();

function buildPoolConfig() {
  const rawUrl = process.env['DATABASE_URL']?.trim();
  if (!rawUrl) {
    throw new Error('Database configuration is missing. Provide DB_* values or DATABASE_URL.');
  }

  const databaseUrl = rawUrl.replace(/^"(.*)"$/, '$1');
  const parsed = new URL(databaseUrl);
  const database = parsed.pathname?.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL must include a database name');
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port || '5432'),
    database,
    user: parsed.username,
    ssl: false,
    password: parsed.password,
  };
}
