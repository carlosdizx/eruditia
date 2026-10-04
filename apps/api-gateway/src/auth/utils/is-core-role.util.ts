import RoleCategoryEnum from '@common/enums/role-category.enum';
import AuthContextInterface from '../interfaces/auth-context.interface';

// Los roles de sistema no pertenecen a una organización, así que no
// dependen de los permisos asignables.
const isCoreRole = ({
  roleCategory,
}: Pick<AuthContextInterface, 'roleCategory'>) =>
  roleCategory === RoleCategoryEnum.CORE;

export default isCoreRole;
