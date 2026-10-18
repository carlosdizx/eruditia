import 'reflect-metadata';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import { AUTH_WITH_PERMISSIONS_KEY } from '@auth/decorators/auth-with-permissions.decorator';
import SubjectConceptsController from '../../src/gradebooks/subject-concepts.controller';
import SubjectConceptsService from '../../src/gradebooks/subject-concepts.service';
import authContextFixture from '../auth/fixtures/auth-context.fixture';

describe('SubjectConceptsController', () => {
  let service: Record<string, jest.Mock>;
  let controller: SubjectConceptsController;

  const auth = authContextFixture();

  beforeEach(() => {
    service = Object.fromEntries(
      ['listSources', 'setConcepts'].map((name) => [
        name,
        jest.fn().mockResolvedValue([]),
      ]),
    );
    controller = new SubjectConceptsController(
      service as unknown as SubjectConceptsService,
    );
  });

  it('requires grade:record for admins and teachers', () => {
    expect(
      Reflect.getMetadata(AUTH_WITH_PERMISSIONS_KEY, SubjectConceptsController),
    ).toEqual({
      roles: [RoleNameEnum.ADMIN, RoleNameEnum.TEACHER],
      permissions: [PermissionEnum.GRADE_RECORD],
      mode: 'all',
    });
  });

  it('delegates with the session', async () => {
    const dto = {
      concepts: [{ minScore: 1, maxScore: 5, conceptText: 'Bien' }],
    };
    await controller.listSources('cs-id', auth);
    await controller.setConcepts('cs-id', 'p1', dto, auth);

    expect(service.listSources).toHaveBeenCalledWith(auth, 'cs-id');
    expect(service.setConcepts).toHaveBeenCalledWith(auth, 'cs-id', 'p1', dto);
  });
});
