const migrationTemplate = `/* eslint-disable @typescript-eslint/no-unused-vars */
import { QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // TODO: implement
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // TODO: implement
};
`;

export default migrationTemplate;
