import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// El colegio decide si el boletín muestra el puesto del estudiante en su salón.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.addColumn('grading_scales', 'show_rank_in_report_card', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.removeColumn(
    'grading_scales',
    'show_rank_in_report_card',
  );
};
