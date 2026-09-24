import { randomBytes } from 'crypto';

const idUtil = (key: string, length: number, queue: boolean) => {
  let md = '';
  if (queue) md = Date.now().toString();
  const bytes = randomBytes(Math.ceil(length / 2));
  const numericString = Array.from(bytes)
    .map((byte) => byte.toString().padStart(3, '0'))
    .join('')
    .slice(0, length);

  return key.concat(md.slice(-4)).concat(numericString).toUpperCase();
};

export default idUtil;
