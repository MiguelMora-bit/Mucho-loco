import { IsBoolean } from 'class-validator';
import type { NotificationPreferences } from '@mucho-loco/types';

/** Spec 053: las tres categorías, completas — un `PUT` reemplaza, no mezcla. */
export class NotificationPreferencesDto implements NotificationPreferences {
  @IsBoolean()
  membership!: boolean;

  @IsBoolean()
  orders!: boolean;

  @IsBoolean()
  payments!: boolean;
}
