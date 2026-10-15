import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const id = {
  type: DataTypes.UUID,
  primaryKey: true,
  defaultValue: Sequelize.literal('uuidv7()'),
};

const organizationId = {
  type: DataTypes.UUID,
  allowNull: false,
  references: { model: 'organizations', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
};

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
      'subjects',
      {
        id,
        organization_id: organizationId,
        name: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(20), allowNull: false },
        area_name: { type: DataTypes.STRING(100), allowNull: true },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex('subjects', ['organization_id', 'code'], {
      name: 'subjects_organization_id_code_unique',
      unique: true,
      where: { deleted_at: null },
      transaction,
    });

    await queryInterface.addIndex('subjects', ['organization_id', 'name'], {
      name: 'subjects_organization_id_name_unique',
      unique: true,
      where: { deleted_at: null },
      transaction,
    });

    await queryInterface.createTable(
      'classroom_subjects',
      {
        id,
        organization_id: organizationId,
        classroom_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'classrooms', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        subject_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'subjects', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        weekly_hours: { type: DataTypes.INTEGER, allowNull: true },
        weight_in_gpa: {
          type: DataTypes.DECIMAL(4, 2),
          allowNull: false,
          defaultValue: 1,
        },
        ...timestamps,
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'classroom_subjects',
      ['classroom_id', 'subject_id'],
      {
        name: 'classroom_subjects_classroom_id_subject_id_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    // "Mis clases" de cada profesor.
    await queryInterface.addIndex('classroom_subjects', ['teacher_id'], {
      name: 'classroom_subjects_teacher_id_index',
      transaction,
    });

    await queryInterface.addIndex('classroom_subjects', ['subject_id'], {
      name: 'classroom_subjects_subject_id_index',
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
    await queryInterface.dropTable('classroom_subjects', { transaction });
    await queryInterface.dropTable('subjects', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
