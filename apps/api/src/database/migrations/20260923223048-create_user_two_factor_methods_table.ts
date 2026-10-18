import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'user_two_factor_methods',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: {
          type: DataTypes.ENUM('passkey', 'email', 'totp'),
          allowNull: false,
        },
        is_enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_default: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        secret: { type: DataTypes.TEXT, allowNull: true },
        verified_at: { type: DataTypes.DATE, allowNull: true },
        last_used_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'user_two_factor_methods',
      ['user_id', 'type'],
      {
        name: 'user_two_factor_methods_user_id_type_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    await queryInterface.addIndex('user_two_factor_methods', ['user_id'], {
      name: 'user_two_factor_methods_user_id_default_unique',
      unique: true,
      where: { is_default: true, deleted_at: null },
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
    await queryInterface.dropTable('user_two_factor_methods', { transaction });
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_user_two_factor_methods_type";',
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
