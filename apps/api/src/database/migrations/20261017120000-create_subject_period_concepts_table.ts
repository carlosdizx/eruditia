import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const reference = (model: string) => ({
  type: DataTypes.UUID,
  allowNull: false,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

// Conceptos evaluativos por rango de nota que cada profesor define para su
// materia en un periodo; el boletín imprime el que corresponda a la definitiva.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'subject_period_concepts',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        organization_id: reference('organizations'),
        classroom_subject_id: reference('classroom_subjects'),
        academic_period_id: reference('academic_periods'),
        min_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        max_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        concept_text: { type: DataTypes.TEXT, allowNull: false },
        updated_by: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'subject_period_concepts',
      ['classroom_subject_id', 'academic_period_id'],
      {
        name: 'subject_period_concepts_classroom_subject_period_index',
        transaction,
      },
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
  await queryInterface.dropTable('subject_period_concepts');
};
