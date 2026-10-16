import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// Regla confirmada por los colegios: perder una materia reprueba el año y el
// promedio general solo cuenta si el colegio lo activa.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.addColumn(
      'grading_scales',
      'fail_by_average',
      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      { transaction },
    );
    await queryInterface.changeColumn(
      'grading_scales',
      'max_failed_subjects',
      { type: DataTypes.SMALLINT, allowNull: true, defaultValue: 1 },
      { transaction },
    );
    // El 3 lo había puesto por defecto la migración anterior.
    await queryInterface.bulkUpdate(
      'grading_scales',
      { max_failed_subjects: 1 },
      { max_failed_subjects: 3 },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.changeColumn(
      'grading_scales',
      'max_failed_subjects',
      { type: DataTypes.SMALLINT, allowNull: true, defaultValue: 3 },
      { transaction },
    );
    await queryInterface.removeColumn('grading_scales', 'fail_by_average', {
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
