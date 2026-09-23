import { join } from 'path';
import idUtil from '@common/utils/id.util';
import createTimestampedFile from '@database/config/create-timestamped-file';
import seedTemplate from '@database/config/seed-template';

let name = process.argv[2];

if (!name) name = idUtil('seed', 10, false);

const filePath = createTimestampedFile(
  join(__dirname, '../seeders'),
  name,
  seedTemplate,
);

console.log(`Created ${filePath}`);
