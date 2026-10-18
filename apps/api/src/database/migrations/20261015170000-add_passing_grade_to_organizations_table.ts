import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// Nota mínima con la que el asistente de promoción sugiere aprobar el año.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.addColumn('organizations', 'passing_grade', {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 3,
  });
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.removeColumn('organizations', 'passing_grade');
};
