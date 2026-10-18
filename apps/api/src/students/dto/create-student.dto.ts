import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import StudentDocumentTypeEnum from '@common/enums/student-document-type.enum';
import StudentStatusEnum from '@common/enums/student-status.enum';
import {
  DOCUMENT_NUMBER_PATTERN,
  INVALID_DOCUMENT_NUMBER_MESSAGE,
  INVALID_PHONE_MESSAGE,
  PHONE_PATTERN,
} from '@common/constants/contact-validation.constant';
import {
  BIRTH_DATE_PATTERN,
  INVALID_BIRTH_DATE_MESSAGE,
  INVALID_STUDENT_CODE_MESSAGE,
  STUDENT_CODE_PATTERN,
} from '../constants/student-validation.constant';

export default class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEnum(StudentDocumentTypeEnum)
  documentType: StudentDocumentTypeEnum;

  @Matches(DOCUMENT_NUMBER_PATTERN, {
    message: INVALID_DOCUMENT_NUMBER_MESSAGE,
  })
  documentNumber: string;

  // Si no se envía, se usa el número de documento.
  @IsOptional()
  @Matches(STUDENT_CODE_PATTERN, { message: INVALID_STUDENT_CODE_MESSAGE })
  studentCode?: string;

  // Solo fecha (YYYY-MM-DD).
  @IsOptional()
  @IsISO8601({ strict: true }, { message: INVALID_BIRTH_DATE_MESSAGE })
  @Matches(BIRTH_DATE_PATTERN, { message: INVALID_BIRTH_DATE_MESSAGE })
  birthDate?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  guardianName?: string;

  @IsOptional()
  @Matches(PHONE_PATTERN, { message: INVALID_PHONE_MESSAGE })
  guardianPhone?: string;

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @IsOptional()
  @IsEnum(StudentStatusEnum)
  status?: StudentStatusEnum;
}
