import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@app/common/decorators/roles.decorator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  role?: Role;
}
