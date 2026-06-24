import {
  Archive,
  Bell,
  Download,
  Filter,
  FolderKanban,
  History,
  MapPin,
  PenLine,
  Radio,
  Share2,
  Sparkles,
  Tag,
  UserPlus,
} from 'lucide-react';
import type { PackageFeatureKey } from '@/components/admin/constants/package-features.constants';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<PackageFeatureKey, LucideIcon> = {
  saved_filters_limit: Filter,
  allow_discount_codes: Tag,
  allow_invite_codes: UserPlus,
  ring_binders_limit: FolderKanban,
  districts_limit: MapPin,
  notifications_limit: Bell,
  zip_downloads_per_day: Download,
  divar_drafts_per_day: PenLine,
  ai_edits_limit: Sparkles,
  channels_limit: Radio,
  share_ring_binder: Share2,
  builders_archive: Archive,
  archive_history_quarters: History,
};

export function getPackageFeatureIcon(key: PackageFeatureKey): LucideIcon {
  return ICON_MAP[key];
}
