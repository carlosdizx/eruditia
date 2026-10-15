import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'grade_levels',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        organization_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        name: { type: DataTypes.STRING(50), allowNull: false },
        short_name: { type: DataTypes.STRING(10), allowNull: false },
        sequence_order: { type: DataTypes.INTEGER, allowNull: false },
        is_final_grade: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    // La promoción va de sequence_order a sequence_order + 1: no se repite.
    await queryInterface.addIndex(
      'grade_levels',
      ['organization_id', 'sequence_order'],
      {
        name: 'grade_levels_organization_id_sequence_order_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    await queryInterface.addIndex('grade_levels', ['organization_id', 'name'], {
      name: 'grade_levels_organization_id_name_unique',
      unique: true,
      where: { deleted_at: null },
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
  await queryInterface.dropTable('grade_levels');
};
