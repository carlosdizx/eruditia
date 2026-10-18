import { IsUUID, Matches } from 'class-validator';

export default class VerifyTwoFactorDto {
  @IsUUID()
  challengeId: string;

  @Matches(/^\d{6}$/)
  code: string;
}
