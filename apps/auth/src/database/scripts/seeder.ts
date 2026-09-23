import { join } from 'path';
import { Umzug } from 'umzug';
import createCliDrizzle from '@database/config/cli-drizzle.config';
import PgUmzugStorage from '@database/config/pg-umzug-storage';
import runUmzugCommand from '@database/config/run-umzug-command';

async function main() {
  const { db, pool } = createCliDrizzle();

  const umzug = new Umzug({
    migrations: { glob: ['seeders/*.ts', { cwd: join(__dirname, '..') }] },
    context: db,
    storage: new PgUmzugStorage(pool, 'drizzle_seeds'),
    logger: console,
  });

  await runUmzugCommand(umzug, process.argv[2]);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
