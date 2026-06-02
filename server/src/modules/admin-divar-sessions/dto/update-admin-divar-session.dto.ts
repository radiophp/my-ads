import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDivarSessionDto } from './create-admin-divar-session.dto';

export class UpdateAdminDivarSessionDto extends PartialType(CreateAdminDivarSessionDto) {}
