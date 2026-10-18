import { ConflictException, Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import RoleNameEnum from '@common/enums/role-name.enum';
import StudentModel from '@database/models/student.model';
import UsersService from '../users/users.service';
import RolesService from '../roles/roles.service';
import StudentRepository from './student.repository';
import {
  ACCOUNT_ALREADY_LINKED_MESSAGE,
  ACCOUNT_EMAIL_IN_USE_MESSAGE,
  HAS_ACCOUNT_MESSAGE,
  NO_ACCOUNT_MESSAGE,
} from './constants/student-messages.constant';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import { STUDENT_USER_INCLUDE } from './utils/public-student.util';

type AccountOwner = Pick<StudentModel, 'firstName' | 'lastName'>;

// Cuenta de usuario (rol STUDENT) del estudiante. Con o sin ella, su boletín
// se consulta en el portal público con año lectivo + documento.
@Injectable()
export default class StudentAccessService {
  constructor(
    private readonly repository: StudentRepository,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  private findManageableStudent = async (
    actor: OrganizationActor,
    studentId: string,
    transaction?: Transaction,
  ) => {
    const student = (await this.repository.findOne(
      { id: studentId, organizationId: organizationOf(actor) },
      true,
      {
        attributes: ['id', 'organizationId', 'userId', 'firstName', 'lastName'],
        include: STUDENT_USER_INCLUDE,
        transaction,
      },
    ))!;

    return { student, hasAccount: !!student.user };
  };

  // Crea la cuenta (le llega la contraseña temporal por correo) o vincula una
  // de estudiante de la misma organización que esté libre.
  public provideAccount = async (
    organizationId: string,
    email: string,
    { firstName, lastName }: AccountOwner,
    transaction: Transaction,
  ) => {
    const role = (await this.rolesService.findOne(
      { name: RoleNameEnum.STUDENT },
      true,
      { attributes: ['id'], transaction },
    ))!;

    const existing = await this.usersService.findOne({ email }, false, {
      attributes: ['id', 'organizationId', 'roleId', 'isActive'],
      transaction,
    });

    if (!existing)
      return await this.usersService.createUser(
        { firstName, lastName, email, roleId: role.id, organizationId },
        transaction,
      );

    if (
      existing.organizationId !== organizationId ||
      existing.roleId !== role.id
    )
      throw new ConflictException(ACCOUNT_EMAIL_IN_USE_MESSAGE);

    const linked = await this.repository.findOne(
      { userId: existing.id },
      false,
      {
        attributes: ['id'],
        transaction,
      },
    );
    if (linked) throw new ConflictException(ACCOUNT_ALREADY_LINKED_MESSAGE);

    // Pudo quedar desactivada al desvincularla.
    if (!existing.isActive)
      await this.usersService.updateByPk(
        existing.id,
        { isActive: true },
        { transaction },
      );

    return existing;
  };

  public linkAccount = async (
    actor: OrganizationActor,
    studentId: string,
    email: string,
  ) =>
    await this.repository.transaction(async (transaction) => {
      const { student, hasAccount } = await this.findManageableStudent(
        actor,
        studentId,
        transaction,
      );
      if (hasAccount) throw new ConflictException(HAS_ACCOUNT_MESSAGE);

      const user = await this.provideAccount(
        student.organizationId,
        email,
        student,
        transaction,
      );

      await this.repository.updateByPk(
        student.id,
        { userId: user.id },
        { transaction },
      );

      return await this.findWithAccount(student.id, transaction);
    });

  private findWithAccount = async (
    studentId: string,
    transaction: Transaction,
  ) =>
    (await this.repository.findByPk(studentId, true, {
      include: STUDENT_USER_INCLUDE,
      transaction,
    }))!;

  // La cuenta se desactiva (no se elimina).
  public unlinkAccount = async (actor: OrganizationActor, studentId: string) =>
    await this.repository.transaction(async (transaction) => {
      const { student, hasAccount } = await this.findManageableStudent(
        actor,
        studentId,
        transaction,
      );
      if (!hasAccount) throw new ConflictException(NO_ACCOUNT_MESSAGE);

      await this.usersService.updateByPk(
        student.userId!,
        { isActive: false },
        { transaction },
      );

      await this.repository.updateByPk(
        student.id,
        { userId: null },
        { transaction },
      );

      return await this.findWithAccount(student.id, transaction);
    });
}
