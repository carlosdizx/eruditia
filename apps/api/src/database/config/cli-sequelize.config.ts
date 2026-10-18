import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import databaseSchema from '@common/schemas/database.schema';
import databaseOptionsUtil from '@database/util/database-options.util';

dotenv.config();

const createCliSequelize = (): Sequelize => {
  const env = databaseSchema.parse(process.env);
  return new Sequelize(databaseOptionsUtil(env));
};

export default createCliSequelize;
