import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const pad = (value: number): string => {
  return String(value).padStart(2, '0');
};

const timestamp = (): string => {
  const now = new Date();
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
};

const createTimestampedFile = (
  dir: string,
  name: string,
  template: string,
): string => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filePath = join(dir, `${timestamp()}-${name}.ts`);
  writeFileSync(filePath, template);

  return filePath;
};

export default createTimestampedFile;
