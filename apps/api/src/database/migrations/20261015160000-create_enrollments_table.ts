import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const reference = (model: string, allowNull = false) => ({
  type: DataTypes.UUID,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: allowNull ? 'SET NULL' : 'RESTRICT',
});

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'enrollments',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        organization_id: reference('organizations'),
        student_id: reference('students'),
        academic_year_id: reference('academic_years'),
        classroom_id: reference('classrooms'),
        enrollment_date: { type: DataTypes.DATEONLY, allowNull: false },
        status: {
          type: DataTypes.ENUM(
            'in_progress',
            'promoted',
            'failed',
            'withdrawn',
            'graduated',
            'transferred',
          ),
          allowNull: false,
          defaultValue: 'in_progress',
        },
        final_average: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        promotion_notes: { type: DataTypes.TEXT, allowNull: true },
        promoted_from_enrollment_id: reference('enrollments', true),
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    // Una sola matrícula cursando por estudiante y año lectivo.
    await queryInterface.addIndex(
      'enrollments',
      ['student_id', 'academic_year_id'],
      {
        name: 'enrollments_student_id_academic_year_id_in_progress_unique',
        unique: true,
        where: { status: 'in_progress', deleted_at: null },
        transaction,
      },
    );

    // Lista de clase de cada salón.
    await queryInterface.addIndex('enrollments', ['classroom_id'], {
      name: 'enrollments_classroom_id_index',
      transaction,
    });

    await queryInterface.addIndex('enrollments', ['academic_year_id'], {
      name: 'enrollments_academic_year_id_index',
      transaction,
    });

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
    await queryInterface.dropTable('enrollments', { transaction });
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_enrollments_status";',
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
