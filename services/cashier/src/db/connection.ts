import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types.js';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections in pool
});

// Create Kysely instance with PostgreSQL dialect
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

// Export pool for direct access if needed (e.g., health checks)
export { pool };

// Graceful shutdown helper
export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
