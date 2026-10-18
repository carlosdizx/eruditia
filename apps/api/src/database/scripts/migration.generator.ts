import { join } from 'path';
import idUtil from '@common/utils/id.util';
import createTimestampedFile from '@database/config/create-timestamped-file';
import migrationTemplate from '@database/config/migration-template';

let name = process.argv[2];

if (!name) name = idUtil('mig', 10, false);

const filePath = createTimestampedFile(
  join(__dirname, '../migrations'),
  name,
  migrationTemplate,
);

console.log(`Created ${filePath}`);
