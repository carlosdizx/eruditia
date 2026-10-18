import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'user_passkeys',
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
        name: { type: DataTypes.STRING(100), allowNull: true },
        credential_id: { type: DataTypes.TEXT, allowNull: false },
        public_key: { type: DataTypes.TEXT, allowNull: false },
        counter: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        device_type: { type: DataTypes.STRING(32), allowNull: false },
        backed_up: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        transports: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        aaguid: { type: DataTypes.STRING(36), allowNull: true },
        last_used_at: { type: DataTypes.DATE, allowNull: true },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    await queryInterface.addIndex('user_passkeys', ['credential_id'], {
      name: 'user_passkeys_credential_id_unique',
      unique: true,
      where: { deleted_at: null },
      transaction,
    });

    await queryInterface.addIndex('user_passkeys', ['user_id'], {
      name: 'user_passkeys_user_id_index',
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
    await queryInterface.dropTable('user_passkeys', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
