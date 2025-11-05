import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '+12345678900' })
  phone!: string;

  @ApiProperty({ example: 'user@example.com', nullable: true, required: false })
  email!: string | null;

  @ApiProperty({ example: 'Alex', nullable: true, required: false })
  firstName!: string | null;

  @ApiProperty({ example: 'Johnson', nullable: true, required: false })
  lastName!: string | null;

  @ApiProperty({ example: 1, nullable: true, required: false })
  cityId!: number | null;

  @ApiProperty({ example: 'Tehran', nullable: true, required: false })
  city!: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/profile.jpg',
    nullable: true,
    required: false,
  })
  profileImageUrl!: string | null;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}
