import { Logger } from '@nestjs/common';

export default interface RepositoryOptionsInterface {
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
