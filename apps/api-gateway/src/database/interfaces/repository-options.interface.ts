import { Logger } from '@nestjs/common';
import { Model } from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default interface RepositoryOptionsInterface<T extends Model> {
  idGenerator?: () => string;
  logger?: Logger;
  createMessage?: string;
  insertManyMessage?: string;
  findOrCreateMessage?: string;
  findByPkMessage?: string;
  findByPkNotFoundMessage?: string;
  findOneMessage?: string;
  findOneNotFoundMessage?: string;
  findAllMessage?: string;
  findAllPaginatedMessage?: string;
  updateByPkMessage?: string;
  updateByQueryMessage?: string;
  deleteByPkMessage?: string;
  restoreByPkMessage?: string;
  transactionMessage?: string;
}
