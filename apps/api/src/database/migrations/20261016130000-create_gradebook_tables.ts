import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const id = {
  type: DataTypes.UUID,
  primaryKey: true,
  defaultValue: Sequelize.literal('uuidv7()'),
};
const timestamps = {
  created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
  updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
};
const reference = (model: string, onDelete = 'RESTRICT') => ({
  type: DataTypes.UUID,
  allowNull: false,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

// Columnas de la planilla, notas por actividad y definitiva por periodo. Sin
// borrado lógico: al quitar una actividad se van sus notas.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'evaluation_items',
      {
        id,
        organization_id: reference('organizations', 'CASCADE'),
        classroom_subject_id: reference('classroom_subjects', 'CASCADE'),
        academic_period_id: reference('academic_periods', 'CASCADE'),
        title: { type: DataTypes.STRING(100), allowNull: false },
        weight_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        sort_order: { type: DataTypes.INTEGER, allowNull: false },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'evaluation_items',
      ['classroom_subject_id', 'academic_period_id'],
      { name: 'evaluation_items_classroom_subject_period_index', transaction },
    );

    await queryInterface.addConstraint('evaluation_items', {
      type: 'check',
      name: 'evaluation_items_weight_check',
      fields: ['weight_percentage'],
      where: Sequelize.literal(
        'weight_percentage > 0 AND weight_percentage <= 100',
      ),
      transaction,
    });

    await queryInterface.createTable(
      'student_grades',
      {
        id,
        organization_id: reference('organizations', 'CASCADE'),
        enrollment_id: reference('enrollments', 'CASCADE'),
        evaluation_item_id: reference('evaluation_items', 'CASCADE'),
        score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        feedback: { type: DataTypes.TEXT, allowNull: true },
        updated_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'student_grades',
      ['evaluation_item_id', 'enrollment_id'],
      {
        name: 'student_grades_item_enrollment_unique',
        unique: true,
        transaction,
      },
    );

    await queryInterface.addIndex('student_grades', ['enrollment_id'], {
      name: 'student_grades_enrollment_id_index',
      transaction,
    });

    await queryInterface.createTable(
      'period_subject_summaries',
      {
        id,
        organization_id: reference('organizations', 'CASCADE'),
        enrollment_id: reference('enrollments', 'CASCADE'),
        classroom_subject_id: reference('classroom_subjects', 'CASCADE'),
        academic_period_id: reference('academic_periods', 'CASCADE'),
        // Null mientras no tenga ninguna nota en el periodo.
        final_period_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        teacher_observation: { type: DataTypes.TEXT, allowNull: true },
        is_passed: { type: DataTypes.BOOLEAN, allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'period_subject_summaries',
      ['classroom_subject_id', 'academic_period_id', 'enrollment_id'],
      {
        name: 'period_subject_summaries_subject_period_enrollment_unique',
        unique: true,
        transaction,
      },
    );

    await queryInterface.addIndex(
      'period_subject_summaries',
      ['enrollment_id'],
      { name: 'period_subject_summaries_enrollment_id_index', transaction },
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
    await queryInterface.dropTable('period_subject_summaries', { transaction });
    await queryInterface.dropTable('student_grades', { transaction });
    await queryInterface.dropTable('evaluation_items', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
