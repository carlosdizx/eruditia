import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

// Reglas de promoción: el promedio sale de las planillas y solo se ajusta a
// mano dejando quién lo hizo. Reprobar N materias o más también reprueba el
// año (null: la regla no aplica).
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.addColumn(
      'grading_scales',
      'max_failed_subjects',
      { type: DataTypes.SMALLINT, allowNull: true, defaultValue: 3 },
      { transaction },
    );
    await queryInterface.addConstraint('grading_scales', {
      type: 'check',
      name: 'grading_scales_max_failed_subjects_check',
      fields: ['max_failed_subjects'],
      where: Sequelize.literal(
        'max_failed_subjects IS NULL OR max_failed_subjects >= 1',
      ),
      transaction,
    });

    await queryInterface.addColumn(
      'enrollments',
      'computed_average',
      { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      { transaction },
    );
    await queryInterface.addColumn(
      'enrollments',
      'average_adjusted_by',
      {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
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
    await queryInterface.removeColumn('enrollments', 'average_adjusted_by', {
      transaction,
    });
    await queryInterface.removeColumn('enrollments', 'computed_average', {
      transaction,
    });
    await queryInterface.removeConstraint(
      'grading_scales',
      'grading_scales_max_failed_subjects_check',
      { transaction },
    );
    await queryInterface.removeColumn('grading_scales', 'max_failed_subjects', {
      transaction,
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
