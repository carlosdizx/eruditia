import { IsBoolean } from 'class-validator';

export default class UpdateAcademicPeriodDto {
  @IsBoolean()
  isOpenForGrading: boolean;
}
