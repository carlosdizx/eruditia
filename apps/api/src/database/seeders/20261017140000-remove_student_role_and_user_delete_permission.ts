import { Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// Sin rol de estudiante (el boletín se consulta en el portal público) y sin
// eliminar usuarios (solo se desactivan):
// - Las cuentas STUDENT quedan desactivadas y borradas lógicamente junto con
//   el rol (users.role_id es RESTRICT, y no se pierde su historial). Se
//   cierran sus sesiones.
// - El permiso user:delete se borra con sus asignaciones.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'STUDENT'`,
      { transaction },
    );
    const roleIds = (roles as { id: string }[]).map(({ id }) => id);

    if (roleIds.length) {
      await queryInterface.sequelize.query(
        `DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE role_id IN (:roleIds))`,
        { replacements: { roleIds }, transaction },
      );
      await queryInterface.bulkUpdate(
        'users',
        { is_active: false, deleted_at: new Date() },
        { role_id: { [Op.in]: roleIds }, deleted_at: null },
        { transaction },
      );
      await queryInterface.bulkUpdate(
        'roles',
        { deleted_at: new Date() },
        { id: { [Op.in]: roleIds } },
        { transaction },
      );
    }

    await queryInterface.bulkDelete(
      'permissions',
      { key: 'user:delete' },
      { transaction },
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Recupera el rol, no las cuentas. El permiso lo vuelve a crear el catálogo si
// se restaura en PermissionEnum.
export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.bulkUpdate(
      'roles',
      { deleted_at: null },
      { name: 'STUDENT' },
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
