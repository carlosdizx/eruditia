import { ConflictException, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import SubjectModel from '@database/models/subject.model';
import CrudService from '@database/services/crud.service';
import organizationOf, {
  type OrganizationActor,
} from '@common/utils/organization-of.util';
import SubjectRepository from './subject.repository';
import ClassroomSubjectRepository from '../classroom-subjects/classroom-subject.repository';
import CreateSubjectDto from './dto/create-subject.dto';
import UpdateSubjectDto from './dto/update-subject.dto';
import STANDARD_SUBJECTS from './constants/standard-subjects.constant';
import {
  SUBJECT_CODE_IN_USE_MESSAGE,
  SUBJECT_HAS_CLASSROOMS_MESSAGE,
  SUBJECT_NAME_IN_USE_MESSAGE,
} from './constants/subject-messages.constant';

@Injectable()
export default class SubjectsService extends CrudService<
  SubjectModel,
  SubjectRepository
> {
  constructor(
    protected readonly repository: SubjectRepository,
    private readonly classroomSubjectRepository: ClassroomSubjectRepository,
  ) {
    super(repository);
  }

  private assertAvailable = async (
    organizationId: string,
    { name, code }: UpdateSubjectDto,
    exceptSubjectId?: string,
  ) => {
    const candidates = [
      ...(name ? [{ name }] : []),
      ...(code ? [{ code }] : []),
    ];
    if (!candidates.length) return;

    const existing = await this.findOne(
      {
        organizationId,
        [Op.or]: candidates,
        ...(exceptSubjectId && { id: { [Op.ne]: exceptSubjectId } }),
      },
      false,
      { attributes: ['id', 'name', 'code'] },
    );
    if (!existing) return;

    throw new ConflictException(
      name && existing.name === name
        ? SUBJECT_NAME_IN_USE_MESSAGE
        : SUBJECT_CODE_IN_USE_MESSAGE,
    );
  };

  public listSubjects = async (actor: OrganizationActor) =>
    await this.findAll(
      { organizationId: organizationOf(actor) },
      { order: [['name', 'ASC']] },
    );

  public createSubject = async (
    actor: OrganizationActor,
    dto: CreateSubjectDto,
  ) => {
    const organizationId = organizationOf(actor);
    await this.assertAvailable(organizationId, dto);

    return await this.create({ ...dto, organizationId });
  };

  // Una materia de otra organización responde 404, igual que una inexistente.
  public updateSubject = async (
    actor: OrganizationActor,
    subjectId: string,
    dto: UpdateSubjectDto,
  ) => {
    const organizationId = organizationOf(actor);

    await this.findOne({ id: subjectId, organizationId }, true, {
      attributes: ['id'],
    });
    await this.assertAvailable(organizationId, dto, subjectId);

    return await this.updateByPk(subjectId, dto);
  };

  public deleteSubject = async (
    actor: OrganizationActor,
    subjectId: string,
  ) => {
    await this.findOne(
      { id: subjectId, organizationId: organizationOf(actor) },
      true,
      { attributes: ['id'] },
    );

    const assigned = await this.classroomSubjectRepository.findOne(
      { subjectId },
      false,
      { attributes: ['id'] },
    );
    if (assigned) throw new ConflictException(SUBJECT_HAS_CLASSROOMS_MESSAGE);

    await this.deleteByPk(subjectId);
  };

  // Crea las materias base que falten (por nombre o código); no toca las
  // existentes.
  public loadStandardSubjects = async (actor: OrganizationActor) => {
    const organizationId = organizationOf(actor);

    const existing = await this.findAll(
      { organizationId },
      { attributes: ['name', 'code'] },
    );
    const usedNames = new Set(existing.map(({ name }) => name.toLowerCase()));
    const usedCodes = new Set(existing.map(({ code }) => code.toUpperCase()));

    const missing = STANDARD_SUBJECTS.filter(
      ({ name, code }) =>
        !usedNames.has(name.toLowerCase()) && !usedCodes.has(code),
    );

    if (missing.length)
      await this.transaction((transaction) =>
        this.insertMany(
          missing.map((subject) => ({ ...subject, organizationId })),
          { transaction },
        ),
      );

    return {
      created: missing.length,
      skipped: STANDARD_SUBJECTS.length - missing.length,
    };
  };
}
