import { Role } from '@app/common/decorators/roles.decorator';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    role: Role;
    isActive: boolean;
  };
}
