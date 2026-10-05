import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'organizations',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        name: { type: DataTypes.STRING, allowNull: false },
        slug: { type: DataTypes.STRING(100), allowNull: false },
        legal_name: { type: DataTypes.STRING, allowNull: true },
        tax_id: { type: DataTypes.STRING(50), allowNull: true },
        school_code: { type: DataTypes.STRING(50), allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        address: { type: DataTypes.STRING, allowNull: true },
        city: { type: DataTypes.STRING(100), allowNull: true },
        state: { type: DataTypes.STRING(100), allowNull: true },
        country: { type: DataTypes.STRING(2), allowNull: true },
        website: { type: DataTypes.STRING, allowNull: true },
        logo_url: { type: DataTypes.STRING, allowNull: true },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    await queryInterface.addIndex('organizations', ['slug'], {
      name: 'organizations_slug_unique',
      unique: true,
      where: { deleted_at: null },
      transaction,
    });

    await queryInterface.addIndex('organizations', ['tax_id'], {
      name: 'organizations_tax_id_unique',
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
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.dropTable('organizations', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
