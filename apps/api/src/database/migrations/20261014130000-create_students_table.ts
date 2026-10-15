import { DataTypes, Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'students',
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
        user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        student_code: { type: DataTypes.STRING(30), allowNull: false },
        document_type: {
          type: DataTypes.ENUM('RC', 'TI', 'CC', 'OTRO'),
          allowNull: false,
        },
        document_number: { type: DataTypes.STRING(30), allowNull: false },
        first_name: { type: DataTypes.STRING(100), allowNull: false },
        last_name: { type: DataTypes.STRING(100), allowNull: false },
        birth_date: { type: DataTypes.DATEONLY, allowNull: true },
        guardian_name: { type: DataTypes.STRING(200), allowNull: true },
        guardian_phone: { type: DataTypes.STRING(20), allowNull: true },
        guardian_email: { type: DataTypes.STRING, allowNull: true },
        access_pin: { type: DataTypes.STRING, allowNull: true },
        status: {
          type: DataTypes.ENUM('active', 'withdrawn', 'graduated', 'suspended'),
          allowNull: false,
          defaultValue: 'active',
        },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        deleted_at: { type: DataTypes.DATE, allowNull: true },
      },
      { transaction },
    );

    await queryInterface.addIndex(
      'students',
      ['organization_id', 'document_number'],
      {
        name: 'students_organization_id_document_number_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    await queryInterface.addIndex(
      'students',
      ['organization_id', 'student_code'],
      {
        name: 'students_organization_id_student_code_unique',
        unique: true,
        where: { deleted_at: null },
        transaction,
      },
    );

    await queryInterface.addIndex('students', ['organization_id', 'status'], {
      name: 'students_organization_id_status_index',
      transaction,
    });

    // Una cuenta de acceso pertenece a un solo estudiante.
    await queryInterface.addIndex('students', ['user_id'], {
      name: 'students_user_id_unique',
      unique: true,
      where: { user_id: { [Op.ne]: null }, deleted_at: null },
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
    await queryInterface.dropTable('students', { transaction });
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_students_document_type";',
      { transaction },
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_students_status";',
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
