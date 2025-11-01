import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { UsersService } from '@app/modules/users/users.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
