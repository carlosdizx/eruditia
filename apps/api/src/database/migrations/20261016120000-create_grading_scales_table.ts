import { DataTypes, QueryInterface } from 'sequelize';
import { MigrationFn } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

// La escala reemplaza a organizations.passing_grade: se copia la nota mínima
// que ya tuviera cada organización sobre la escala 1.0 - 5.0.
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'grading_scales',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal('uuidv7()'),
        },
        organization_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'organizations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        min_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        max_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        passing_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        decimal_places: { type: DataTypes.SMALLINT, allowNull: false },
        created_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.fn('NOW') },
      },
      { transaction },
    );

    await queryInterface.addConstraint('grading_scales', {
      type: 'check',
      name: 'grading_scales_range_check',
      fields: ['min_score', 'max_score', 'passing_score'],
      where: Sequelize.literal(
        'min_score >= 0 AND min_score < passing_score AND passing_score <= max_score',
      ),
      transaction,
    });

    await queryInterface.addConstraint('grading_scales', {
      type: 'check',
      name: 'grading_scales_decimal_places_check',
      fields: ['decimal_places'],
      where: { decimal_places: [1, 2] },
      transaction,
    });

    await queryInterface.sequelize.query(
      `INSERT INTO grading_scales
         (organization_id, min_score, max_score, passing_score, decimal_places)
       SELECT id,
              LEAST(1, passing_grade - 0.01),
              GREATEST(5, passing_grade),
              passing_grade,
              CASE WHEN passing_grade * 10 = TRUNC(passing_grade * 10) THEN 1 ELSE 2 END
         FROM organizations`,
      { transaction },
    );

    await queryInterface.removeColumn('organizations', 'passing_grade', {
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
    await queryInterface.addColumn(
      'organizations',
      'passing_grade',
      { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 3 },
      { transaction },
    );

    await queryInterface.sequelize.query(
      `UPDATE organizations o
          SET passing_grade = g.passing_score
         FROM grading_scales g
        WHERE g.organization_id = o.id`,
      { transaction },
    );

    await queryInterface.dropTable('grading_scales', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
