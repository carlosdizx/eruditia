import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const timestamps = {
  created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
  updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
};

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'academic_years',
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
        start_date: { type: DataTypes.DATEONLY, allowNull: false },
        end_date: { type: DataTypes.DATEONLY, allowNull: false },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: DataTypes.ENUM('open', 'closed'),
          allowNull: false,
          defaultValue: 'open',
        },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'academic_years',
      ['organization_id', 'name'],
      {
        name: 'academic_years_organization_id_name_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    // El año que el selector muestra por defecto: uno por organización.
    await queryInterface.addIndex('academic_years', ['organization_id'], {
      name: 'academic_years_organization_id_active_unique',
      unique: true,
      where: { is_active: true, deleted_at: null },
      transaction,
    });

    await queryInterface.createTable(
      'academic_periods',
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
        academic_year_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'academic_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        name: { type: DataTypes.STRING(50), allowNull: false },
        order_index: { type: DataTypes.INTEGER, allowNull: false },
        weight_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        is_open_for_grading: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex('academic_periods', ['academic_year_id'], {
      name: 'academic_periods_academic_year_id_index',
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
    await queryInterface.dropTable('academic_periods', { transaction });
    await queryInterface.dropTable('academic_years', { transaction });
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_academic_years_status";',
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
