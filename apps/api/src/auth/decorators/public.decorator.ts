import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export default Public;
