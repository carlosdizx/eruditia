import { DataTypes, Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.addColumn(
      'users',
      'document_number',
      { type: DataTypes.STRING(30), allowNull: true },
      { transaction },
    );

    await queryInterface.addColumn(
      'users',
      'phone',
      { type: DataTypes.STRING(20), allowNull: true },
      { transaction },
    );

    // Un documento no se repite dentro del mismo colegio.
    await queryInterface.addIndex(
      'users',
      ['organization_id', 'document_number'],
      {
        name: 'users_organization_id_document_number_unique',
        unique: true,
        where: { document_number: { [Op.ne]: null }, deleted_at: null },
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
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.removeIndex(
      'users',
      'users_organization_id_document_number_unique',
      { transaction },
    );
    await queryInterface.removeColumn('users', 'phone', { transaction });
    await queryInterface.removeColumn('users', 'document_number', {
      transaction,
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
