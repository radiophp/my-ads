import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'Alex', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Johnson', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: 1, nullable: true })
  cityId!: number | null;

  @ApiProperty({ example: 'Tehran', nullable: true })
  city!: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/profile.jpg',
    nullable: true,
  })
  profileImageUrl!: string | null;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
