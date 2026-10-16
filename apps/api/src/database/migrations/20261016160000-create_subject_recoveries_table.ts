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

// Recuperación de una materia perdida: su nota reemplaza el acumulado anual.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'subject_recoveries',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        organization_id: reference('organizations'),
        enrollment_id: reference('enrollments'),
        classroom_subject_id: reference('classroom_subjects'),
        score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        notes: { type: DataTypes.TEXT, allowNull: true },
        recorded_by: {
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
      'subject_recoveries',
      ['classroom_subject_id', 'enrollment_id'],
      {
        name: 'subject_recoveries_classroom_subject_enrollment_unique',
        unique: true,
        transaction,
      },
    );
    await queryInterface.addIndex('subject_recoveries', ['enrollment_id'], {
      name: 'subject_recoveries_enrollment_id_index',
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
  await queryInterface.dropTable('subject_recoveries');
};
