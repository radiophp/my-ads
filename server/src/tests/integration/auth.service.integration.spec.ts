import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '@app/modules/auth/auth.service';
import { UsersService } from '@app/modules/users/users.service';
import jwtConfig from '@app/platform/config/jwt.config';
import { Role } from '@app/common/decorators/roles.decorator';

const mockUsersService = {
  findByEmail: jest.fn(),
  createUser: jest.fn(),
  findById: jest.fn(),
  updateRefreshToken: jest.fn(),
};

describe('AuthService (integration)', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [jwtConfig],
        }),
        JwtModule.register({
          secret: 'test-secret',
        }),
      ],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers a new user and returns tokens', async () => {
    const user = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed',
      role: Role.USER,
      isActive: true,
      hashedRefreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsersService.findByEmail.mockResolvedValueOnce(null);
    mockUsersService.createUser.mockResolvedValueOnce(user);
    mockUsersService.updateRefreshToken.mockResolvedValueOnce(undefined);

    const response = await authService.register({ email: user.email, password: 'P@ssw0rd!' });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
    expect(response.user.email).toBe(user.email);
    expect(mockUsersService.updateRefreshToken).toHaveBeenCalled();
  });
});
