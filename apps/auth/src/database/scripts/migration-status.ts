import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import databaseSchema from '@common/schemas/database.schema';
import databaseOptionsUtil from '@database/util/database-options.util';

dotenv.config();

interface JournalEntry {
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

// drizzle-kit has no built-in "status" command, so this reproduces the old
// `db:migrate:status` behaviour: read the migration history from
// migrations/meta/_journal.json and compare it against how many rows are
// tracked in drizzle's own `drizzle.__drizzle_migrations` table. Drizzle
// applies migrations strictly in journal order, so "executed" is always the
// first N journal entries.
async function main() {
  const env = databaseSchema.parse(process.env);
  const pool = new Pool(databaseOptionsUtil(env));

  const journalPath = join(__dirname, '../migrations/meta/_journal.json');
  const journal: Journal = existsSync(journalPath)
    ? JSON.parse(readFileSync(journalPath, 'utf-8'))
    : { entries: [] };

  let executedCount = 0;
  try {
    const { rows } = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations',
    );
    executedCount = Number(rows[0]?.count ?? 0);
  } catch {
    // Table doesn't exist yet -> nothing has been executed.
    executedCount = 0;
  }

  const executed = journal.entries.slice(0, executedCount).map((e) => e.tag);
  const pending = journal.entries.slice(executedCount).map((e) => e.tag);

  console.log('Executed:', executed);
  console.log('Pending:', pending);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
