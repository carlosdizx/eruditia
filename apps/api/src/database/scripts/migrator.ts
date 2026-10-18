import { join } from 'path';
import { SequelizeStorage, Umzug } from 'umzug';
import createCliSequelize from '@database/config/cli-sequelize.config';
import runUmzugCommand from '@database/config/run-umzug-command';

async function main() {
  const sequelize = createCliSequelize();

  const umzug = new Umzug({
    migrations: { glob: ['migrations/*.ts', { cwd: join(__dirname, '..') }] },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  await runUmzugCommand(umzug, process.argv[2]);
  await sequelize.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
