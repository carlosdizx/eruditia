import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'classrooms',
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
        grade_level_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'grade_levels', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        name: { type: DataTypes.STRING(30), allowNull: false },
        homeroom_teacher_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        capacity: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    // "1°A" existe una vez por año; el de otro año es otro salón (historial).
    await queryInterface.addIndex('classrooms', ['academic_year_id', 'name'], {
      name: 'classrooms_academic_year_id_name_unique',
      unique: true,
      where: { deleted_at: null },
      transaction,
    });

    await queryInterface.addIndex(
      'classrooms',
      ['organization_id', 'academic_year_id'],
      {
        name: 'classrooms_organization_id_academic_year_id_index',
        transaction,
      },
    );

    await queryInterface.addIndex('classrooms', ['grade_level_id'], {
      name: 'classrooms_grade_level_id_index',
      transaction,
    });

    await queryInterface.addIndex('classrooms', ['homeroom_teacher_id'], {
      name: 'classrooms_homeroom_teacher_id_index',
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
  await queryInterface.dropTable('classrooms');
};
