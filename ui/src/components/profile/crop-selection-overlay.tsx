'use client';

import type { ImageInfo, SelectionState } from './profile-image-uploader-types';
import { CROP_SIZE } from './profile-image-uploader-types';

type CropSelectionOverlayProps = {
  imageInfo: ImageInfo;
  selection: SelectionState;
  cropImageSrc: string;
  isCropping: boolean;
  isSelectionDragging: boolean;
  onSelectionPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function CropSelectionOverlay({
  imageInfo,
  selection,
  cropImageSrc,
  isCropping,
  isSelectionDragging,
  onSelectionPointerDown,
}: CropSelectionOverlayProps) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cropImageSrc}
        alt="Crop preview"
        draggable={false}
        className="pointer-events-none select-none"
        loading="lazy"
        style={{
          position: 'absolute',
          top: imageInfo.offsetY,
          left: imageInfo.offsetX,
          width: imageInfo.renderWidth,
          height: imageInfo.renderHeight,
          userSelect: 'none',
        }}
      />
      <div
        className="absolute border-2 border-primary/80 bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
        style={{
          cursor: isCropping
            ? 'progress'
            : isSelectionDragging
              ? 'grabbing'
              : 'grab',
          width: selection.size,
          height: selection.size,
          left: selection.x,
          top: selection.y,
        }}
        onPointerDown={onSelectionPointerDown}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bg-black/40"
        style={{ top: 0, height: selection.y }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bg-black/40"
        style={{
          top: selection.y + selection.size,
          bottom: 0,
        }}
      />
      <div
        className="pointer-events-none absolute bg-black/40"
        style={{
          top: selection.y,
          bottom: CROP_SIZE - (selection.y + selection.size),
          left: 0,
          width: selection.x,
        }}
      />
      <div
        className="pointer-events-none absolute bg-black/40"
        style={{
          top: selection.y,
          bottom: CROP_SIZE - (selection.y + selection.size),
          left: selection.x + selection.size,
          right: 0,
        }}
      />
    </>
  );
}
