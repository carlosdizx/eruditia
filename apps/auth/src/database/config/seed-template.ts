const seedTemplate = `/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrationFn } from 'umzug';
import { DrizzleDb } from '@database/types/drizzle.types';

export const up: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    // TODO: implement
  });
};

export const down: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  await db.transaction(async (tx) => {
    // TODO: implement
  });
};
`;

export default seedTemplate;
