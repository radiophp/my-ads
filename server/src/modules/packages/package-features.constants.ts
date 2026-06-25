export const PACKAGE_FEATURES = {
  saved_filters_limit: {
    type: 'NUMBER',
    defaultValue: '5',
    limitType: 'OVERALL',
    isPermanent: false,
  },
  allow_discount_codes: {
    type: 'BOOLEAN',
    defaultValue: 'true',
    limitType: null,
    isPermanent: false,
  },
  allow_invite_codes: {
    type: 'BOOLEAN',
    defaultValue: 'true',
    limitType: null,
    isPermanent: false,
  },
  ring_binders_limit: {
    type: 'NUMBER',
    defaultValue: '5',
    limitType: 'OVERALL',
    isPermanent: true,
  },
  districts_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL', isPermanent: false },
  notifications_limit: {
    type: 'NUMBER',
    defaultValue: '0',
    limitType: 'DAILY',
    isPermanent: false,
  },
  zip_downloads_per_day: {
    type: 'NUMBER',
    defaultValue: '0',
    limitType: 'DAILY',
    isPermanent: false,
  },
  divar_drafts_per_day: {
    type: 'NUMBER',
    defaultValue: '0',
    limitType: 'DAILY',
    isPermanent: false,
  },
  ai_edits_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'DAILY', isPermanent: false },
  channels_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL', isPermanent: false },
  share_ring_binder: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL', isPermanent: true },
  builders_archive: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL', isPermanent: true },
  archive_history_quarters: {
    type: 'NUMBER',
    defaultValue: '2',
    limitType: 'OVERALL',
    isPermanent: true,
  },
} as const;

export type PackageFeatureKey = keyof typeof PACKAGE_FEATURES;
