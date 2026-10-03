import { Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

const roles = [
  { label: 'Super Admin', label_es: 'Super Administrador', category: 'core' },
  { label: 'Admin', label_es: 'Administrador', category: 'client' },
  { label: 'Teacher', label_es: 'Profesor', category: 'client' },
  { label: 'Student', label_es: 'Estudiante', category: 'client' },
];

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.bulkInsert('roles', roles, { transaction });
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
    await queryInterface.bulkDelete(
      'roles',
      { label: { [Op.in]: roles.map((role) => role.label) } },
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
