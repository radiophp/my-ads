import { IsBoolean, IsOptional } from 'class-validator';
import { Role } from '@app/common/decorators/roles.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  role?: Role;
}
