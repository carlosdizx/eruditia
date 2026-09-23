import { Pool } from 'pg';
import { UmzugStorage } from 'umzug';

// Minimal UmzugStorage implementation on top of raw `pg`, replacing
// umzug's SequelizeStorage now that Sequelize is gone. Auto-creates the
// tracking table (a single `name` column, same shape as SequelizeMeta) on
// first write.
export default class PgUmzugStorage implements UmzugStorage {
  constructor(
    private readonly pool: Pool,
    private readonly tableName: string,
  ) {}

  private async ensureTable(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS "${this.tableName}" (name varchar(255) NOT NULL PRIMARY KEY)`,
    );
  }

  public async logMigration({ name }: { name: string }): Promise<void> {
    await this.ensureTable();
    await this.pool.query(
      `INSERT INTO "${this.tableName}" (name) VALUES ($1)`,
      [name],
    );
  }

  public async unlogMigration({ name }: { name: string }): Promise<void> {
    await this.ensureTable();
    await this.pool.query(`DELETE FROM "${this.tableName}" WHERE name = $1`, [
      name,
    ]);
  }

  public async executed(): Promise<string[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query<{ name: string }>(
      `SELECT name FROM "${this.tableName}" ORDER BY name`,
    );
    return rows.map((row) => row.name);
  }
}
