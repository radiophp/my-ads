import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAllowPostingDto {
  @ApiProperty()
  @IsBoolean()
  allowPosting!: boolean;
}
