import { DataTypes, Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// Sin rol de estudiante (el boletín se consulta en el portal público) y sin
// eliminar usuarios (solo se desactivan).
// - students.user_id desaparece: la ficha ya no tiene cuenta.
// - Las cuentas STUDENT quedan desactivadas y borradas lógicamente junto con
//   el rol (users.role_id es RESTRICT, y no se pierde su historial). Se
//   cierran sus sesiones.
// - El permiso user:delete se borra con sus asignaciones.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.removeIndex('students', 'students_user_id_unique', {
      transaction,
    });
    await queryInterface.removeColumn('students', 'user_id', { transaction });

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

// Recupera el rol y la columna, no las cuentas ni sus vínculos. El permiso lo
// vuelve a crear el catálogo si se restaura en PermissionEnum.
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

    await queryInterface.addColumn(
      'students',
      'user_id',
      {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      { transaction },
    );
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
