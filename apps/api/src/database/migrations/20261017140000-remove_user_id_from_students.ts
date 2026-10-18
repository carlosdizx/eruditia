import { DataTypes, Op, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';

// La ficha del estudiante ya no tiene cuenta de acceso: el boletín se consulta
// en el portal público con año lectivo + documento.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.removeIndex('students', 'students_user_id_unique', {
      transaction,
    });
    await queryInterface.removeColumn('students', 'user_id', { transaction });
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
