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
import { generateAccessPin } from './utils/access-pin.util';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import {
  STUDENT_USER_INCLUDE,
  toPublicStudent,
} from './utils/public-student.util';

type AccountOwner = Pick<StudentModel, 'firstName' | 'lastName'>;

// Un estudiante accede de una sola forma: con su cuenta (rol STUDENT) o, si no
// la tiene, consultando con documento + PIN.
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

      // Con cuenta propia el PIN deja de servir.
      await this.repository.updateByPk(
        student.id,
        { userId: user.id, accessPin: null },
        { transaction },
      );

      return toPublicStudent(
        (await this.repository.findByPk(student.id, true, {
          include: STUDENT_USER_INCLUDE,
          transaction,
        }))!,
      );
    });

  // La cuenta se desactiva (no se elimina) y el estudiante vuelve al PIN.
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

      const { accessPin, accessPinHash } = await generateAccessPin();
      await this.repository.updateByPk(
        student.id,
        { userId: null, accessPin: accessPinHash },
        { transaction },
      );

      return { accessPin };
    });

  // Reemplaza el PIN anterior, que deja de funcionar.
  public regenerateAccessPin = async (
    actor: OrganizationActor,
    studentId: string,
  ) => {
    const { student, hasAccount } = await this.findManageableStudent(
      actor,
      studentId,
    );
    if (hasAccount) throw new ConflictException(HAS_ACCOUNT_MESSAGE);

    const { accessPin, accessPinHash } = await generateAccessPin();
    // userId en null por si apuntaba a una cuenta ya eliminada.
    await this.repository.updateByPk(student.id, {
      userId: null,
      accessPin: accessPinHash,
    });

    return { accessPin };
  };
}
