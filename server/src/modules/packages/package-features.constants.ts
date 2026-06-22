export const PACKAGE_FEATURES = {
  saved_filters_limit: { type: 'NUMBER' as const, defaultValue: '5' },
  allow_discount_codes: { type: 'BOOLEAN' as const, defaultValue: 'true' },
  allow_invite_codes: { type: 'BOOLEAN' as const, defaultValue: 'true' },
  ring_binders_limit: { type: 'NUMBER' as const, defaultValue: '5' },
  districts_limit: { type: 'NUMBER' as const, defaultValue: '0' },
  notifications_limit: { type: 'NUMBER' as const, defaultValue: '0' },
  zip_downloads_per_day: { type: 'NUMBER' as const, defaultValue: '0' },
  divar_drafts_per_day: { type: 'NUMBER' as const, defaultValue: '0' },
  ai_edits_limit: { type: 'NUMBER' as const, defaultValue: '0' },
  channels_limit: { type: 'NUMBER' as const, defaultValue: '0' },
  share_ring_binder: { type: 'BOOLEAN' as const, defaultValue: 'false' },
  builders_archive: { type: 'BOOLEAN' as const, defaultValue: 'false' },
} as const;

export type PackageFeatureKey = keyof typeof PACKAGE_FEATURES;
