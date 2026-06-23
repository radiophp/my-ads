import { IsEnum, IsString, IsUUID } from 'class-validator';

export class ValidateCodeDto {
  @IsUUID()
  packageId!: string;

  @IsString()
  code!: string;

  @IsEnum(['discount', 'invite'])
  type!: 'discount' | 'invite';
}
