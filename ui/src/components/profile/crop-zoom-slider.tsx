'use client';

import type { SelectionState } from './profile-image-uploader-types';

type CropZoomSliderProps = {
  selection: SelectionState | null;
  selectionSizeLimits: { min: number; max: number };
  disabled: boolean;
  zoomLabel: string;
  modalDescription: string;
  onChange: (value: number) => void;
};

export function CropZoomSlider({
  selection,
  selectionSizeLimits,
  disabled,
  zoomLabel,
  modalDescription,
  onChange,
}: CropZoomSliderProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground" htmlFor="crop-size">
        {zoomLabel}
      </label>
      <input
        id="crop-size"
        type="range"
        min={Math.round(selectionSizeLimits.min)}
        max={Math.round(selectionSizeLimits.max)}
        step={1}
        value={selection ? Math.round(selection.size) : Math.round(selectionSizeLimits.max)}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled || !selection}
        className="h-2 w-full cursor-pointer rounded-full bg-muted accent-primary"
      />
      <p className="text-xs text-muted-foreground">{modalDescription}</p>
    </div>
  );
}
