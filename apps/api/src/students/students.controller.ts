import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import CurrentAuth from '@auth/decorators/current-auth.decorator';
import type AuthContextInterface from '@auth/interfaces/auth-context.interface';
import AuthWithPermissions from '@auth/decorators/auth-with-permissions.decorator';
import PermissionEnum from '@common/enums/permission.enum';
import RoleNameEnum from '@common/enums/role-name.enum';
import StudentsService from './students.service';
import StudentAccessService from './student-access.service';
import LinkStudentAccountDto from './dto/link-student-account.dto';
import CreateStudentDto from './dto/create-student.dto';
import UpdateStudentDto from './dto/update-student.dto';
import ListStudentsDto from './dto/list-students.dto';
import { CSV_MAX_FILE_SIZE } from './constants/students-import.constant';

@Controller('students')
export default class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentAccessService: StudentAccessService,
  ) {}

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_LIST],
  })
  @Get()
  public async listStudents(
    @Query() dto: ListStudentsDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.listStudents(auth, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_LIST],
  })
  @Get(':studentId')
  public async findStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.findStudent(auth, studentId);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_CREATE],
  })
  @Post()
  public async createStudent(
    @Body() dto: CreateStudentDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.createStudent(auth, dto);
  }

  // multipart/form-data con el archivo en el campo "file".
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_IMPORT],
  })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @Post('import')
  public async importStudents(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: CSV_MAX_FILE_SIZE })],
      }),
    )
    file: { buffer: Buffer },
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.importStudents(auth, file.buffer);
  }

  // También cambia el estado (activo, retirado, graduado, suspendido).
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_UPDATE],
  })
  @Patch(':studentId')
  public async updateStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateStudentDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentsService.updateStudent(auth, studentId, dto);
  }

  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_UPDATE],
  })
  @Post(':studentId/account')
  public async linkAccount(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() { email }: LinkStudentAccountDto,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentAccessService.linkAccount(auth, studentId, email);
  }

  // Desactiva la cuenta y devuelve el estudiante sin ella.
  @AuthWithPermissions({
    roles: [RoleNameEnum.ADMIN],
    permissions: [PermissionEnum.STUDENT_UPDATE],
  })
  @Delete(':studentId/account')
  public async unlinkAccount(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentAuth() auth: AuthContextInterface,
  ) {
    return await this.studentAccessService.unlinkAccount(auth, studentId);
  }
}
