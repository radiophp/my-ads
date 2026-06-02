import type { SavedFilter } from '@prisma/client';
import type { SavedFilterPayload } from '../saved-filter-payload.util';

export class SavedFilterDto {
  id!: string;
  name!: string;
  payload!: SavedFilterPayload;
  notificationsEnabled!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: SavedFilter, payload: SavedFilterPayload): SavedFilterDto {
    return {
      id: entity.id,
      name: entity.name,
      payload,
      notificationsEnabled: entity.notificationsEnabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
