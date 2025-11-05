import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '@app/modules/auth/auth.service';
import { UsersService } from '@app/modules/users/users.service';
import { OtpService } from '@app/platform/otp/otp.service';
import jwtConfig from '@app/platform/config/jwt.config';
import { Role } from '@app/common/decorators/roles.decorator';

const mockUsersService = {
  findByPhone: jest.fn(),
  findOrCreateByPhone: jest.fn(),
  findById: jest.fn(),
  updateRefreshToken: jest.fn(),
  createUser: jest.fn(),
};

const mockOtpService = {
  sendCode: jest.fn(),
  verifyCode: jest.fn(),
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
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests an OTP for a phone number', async () => {
    const phone = '+12345678900';

    mockUsersService.findOrCreateByPhone.mockResolvedValueOnce({
      id: 'user-otp',
      phone,
      email: null,
      firstName: null,
      lastName: null,
      cityId: null,
      city: null,
      profileImageUrl: null,
      role: Role.USER,
      isActive: true,
      hashedRefreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockOtpService.sendCode.mockResolvedValueOnce(undefined);

    await authService.requestOtp(phone);

    expect(mockUsersService.findOrCreateByPhone).toHaveBeenCalledWith(phone);
    expect(mockOtpService.sendCode).toHaveBeenCalledWith(phone);
  });

  it('verifies an OTP and returns tokens', async () => {
    const user = {
      id: 'user-123',
      phone: '+12345678900',
      email: null,
      firstName: 'Test',
      lastName: 'User',
      cityId: null,
      city: null,
      profileImageUrl: null,
      role: Role.USER,
      isActive: true,
      hashedRefreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOtpService.verifyCode.mockResolvedValueOnce(true);
    mockUsersService.findByPhone.mockResolvedValueOnce(user);
    mockUsersService.updateRefreshToken.mockResolvedValueOnce(undefined);

    const response = await authService.verifyOtp({ phone: user.phone, code: '123456' });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
    expect(response.user.phone).toBe(user.phone);
    expect(mockUsersService.updateRefreshToken).toHaveBeenCalled();
  });
});
