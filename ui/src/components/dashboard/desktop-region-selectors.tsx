import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type DesktopRegionSelectorsProps = {
  isRTL: boolean;
  provinceLabel: string;
  cityLabel: string;
  districtLabel: string;
  provinceButtonLabel: string;
  cityButtonLabel: string;
  districtButtonLabel: string;
  onSelectProvince: () => void;
  onSelectCity: () => void;
  onSelectDistrict: () => void;
  disableProvince?: boolean;
  disableCity?: boolean;
  disableDistrict?: boolean;
  showDistrict?: boolean;
};

export function DesktopRegionSelectors({
  isRTL,
  provinceLabel,
  cityLabel,
  districtLabel,
  provinceButtonLabel,
  cityButtonLabel,
  districtButtonLabel,
  onSelectProvince,
  onSelectCity,
  onSelectDistrict,
  disableProvince,
  disableCity,
  disableDistrict,
  showDistrict = true,
}: DesktopRegionSelectorsProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="space-y-1">
        <label className={cn('text-sm font-medium text-foreground', isRTL ? 'text-right' : 'text-left')}>
          {provinceLabel}
        </label>
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between"
          onClick={onSelectProvince}
          disabled={disableProvince}
        >
          <span className="flex w-full items-center justify-between gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
            <span className="truncate">{provinceButtonLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </Button>
      </div>

      <div className="space-y-1">
        <label className={cn('text-sm font-medium text-foreground', isRTL ? 'text-right' : 'text-left')}>
          {cityLabel}
        </label>
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between"
          onClick={onSelectCity}
          disabled={disableCity}
        >
          <span className="flex w-full items-center justify-between gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
            <span className="truncate">{cityButtonLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </Button>
      </div>

      {showDistrict ? (
        <div className="space-y-1">
          <label className={cn('text-sm font-medium text-foreground', isRTL ? 'text-right' : 'text-left')}>
            {districtLabel}
          </label>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-between"
            onClick={onSelectDistrict}
            disabled={disableDistrict}
          >
            <span className="flex w-full items-center justify-between gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <span className="truncate">{districtButtonLabel}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
