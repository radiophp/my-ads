export const PACKAGE_FEATURES = {
  saved_filters_limit: { type: 'NUMBER', defaultValue: '5', limitType: 'OVERALL' },
  allow_discount_codes: { type: 'BOOLEAN', defaultValue: 'true', limitType: null },
  allow_invite_codes: { type: 'BOOLEAN', defaultValue: 'true', limitType: null },
  ring_binders_limit: { type: 'NUMBER', defaultValue: '5', limitType: 'OVERALL' },
  districts_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL' },
  notifications_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'DAILY' },
  zip_downloads_per_day: { type: 'NUMBER', defaultValue: '0', limitType: 'DAILY' },
  divar_drafts_per_day: { type: 'NUMBER', defaultValue: '0', limitType: 'DAILY' },
  ai_edits_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'DAILY' },
  channels_limit: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL' },
  share_ring_binder: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL' },
  builders_archive: { type: 'NUMBER', defaultValue: '0', limitType: 'OVERALL' },
  archive_history_quarters: { type: 'NUMBER', defaultValue: '2', limitType: 'OVERALL' },
} as const;

export type PackageFeatureKey = keyof typeof PACKAGE_FEATURES;

export function defaultPackageFeatures(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, def] of Object.entries(PACKAGE_FEATURES)) {
    result[key] = def.defaultValue;
  }
  return result;
}
