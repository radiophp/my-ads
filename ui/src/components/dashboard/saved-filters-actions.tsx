import { BookmarkPlus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SavedFiltersActionsProps = {
  showLabel: string;
  usageText?: string;
  saveLabel: string;
  onShow: () => void;
  onSave: () => void;
  disableShow?: boolean;
  disableSave?: boolean;
  saveTitle?: string;
};

export function SavedFiltersActions({
  showLabel,
  usageText,
  saveLabel,
  onShow,
  onSave,
  disableShow,
  disableSave,
  saveTitle,
}: SavedFiltersActionsProps) {
  return (
    <div className="hidden flex-col gap-2 lg:flex">
      <Button type="button" variant="secondary" className="w-full justify-between" onClick={onShow} disabled={disableShow}>
        <span className="truncate">{showLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>
      {usageText ? <p className="text-xs text-muted-foreground">{usageText}</p> : null}
      <div className="hidden lg:flex">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center"
          onClick={onSave}
          disabled={disableSave}
          title={saveTitle}
        >
          <span className="flex items-center justify-center gap-2">
            <BookmarkPlus className="size-4" />
            <span>{saveLabel}</span>
          </span>
        </Button>
      </div>
    </div>
  );
}
