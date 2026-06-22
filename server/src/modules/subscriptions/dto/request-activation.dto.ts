import { IsUUID } from 'class-validator';

export class RequestActivationDto {
  @IsUUID()
  packageId!: string;
}
