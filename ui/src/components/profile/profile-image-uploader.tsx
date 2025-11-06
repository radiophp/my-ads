'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDeleteTempProfileImageMutation,
  useUploadProfileImageMutation,
  useUploadTempProfileImageMutation,
} from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

type ProfileImageTexts = {
  title: string;
  callToAction: string;
  helper: string;
  select: string;
  uploading: string;
  remove: string;
  successTitle: string;
  successDescription: string;
  errorTitle: string;
  errorDescription: string;
  unsupportedTitle: string;
  unsupportedDescription: string;
  modalTitle: string;
  modalDescription: string;
  confirm: string;
  cancel: string;
  zoomLabel: string;
};

type ProfileImageUploaderProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  texts: ProfileImageTexts;
};

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageInfo = {
  naturalWidth: number;
  naturalHeight: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
};

type SelectionState = {
  x: number;
  y: number;
  size: number;
};

type TempUploadMetadata = {
  key: string;
  url: string;
  originalName?: string;
};

const cropSize = 320;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImage = async (imageSrc: string, crop: CropArea): Promise<Blob | null> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const width = Math.max(1, Math.round(crop.width));
  const height = Math.max(1, Math.round(crop.height));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? null), 'image/png');
  });
};

export function ProfileImageUploader({
  value,
  onChange,
  disabled = false,
  texts,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    size: number;
  } | null>(null);

  const tempUploadRef = useRef<TempUploadMetadata | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pendingFileNameRef = useRef<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isSelectionDragging, setIsSelectionDragging] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const [uploadProfileImage, { isLoading: isFinalUploading }] = useUploadProfileImageMutation();
  const [uploadTempProfileImage, { isLoading: isTempUploading }] = useUploadTempProfileImageMutation();
  const [deleteTempProfileImage] = useDeleteTempProfileImageMutation();
  const { toast } = useToast();

  const preview = useMemo(() => value ?? null, [value]);
  const busyWithTempUpload = isPreparingImage || isTempUploading;

  const selectionSizeLimits = useMemo(() => {
    if (!imageInfo) {
      return { min: 96, max: cropSize };
    }
    const max = Math.min(imageInfo.renderWidth, imageInfo.renderHeight);
    const min = Math.min(Math.max(max * 0.35, 64), max);
    return { min, max };
  }, [imageInfo]);

  const clampSelectionPosition = useCallback(
    (x: number, y: number, size: number) => {
      if (!imageInfo) {
        return { x, y };
      }

      const minX = imageInfo.offsetX;
      const maxX = imageInfo.offsetX + imageInfo.renderWidth - size;
      const minY = imageInfo.offsetY;
      const maxY = imageInfo.offsetY + imageInfo.renderHeight - size;

      return {
        x: clamp(x, minX, maxX),
        y: clamp(y, minY, maxY),
      };
    },
    [imageInfo],
  );

  const revokeObjectUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const disposeTempResources = useCallback(async () => {
    const currentTemp = tempUploadRef.current;
    if (currentTemp) {
      try {
        await deleteTempProfileImage({ key: currentTemp.key }).unwrap();
      } catch (error) {
        console.error('Failed to delete temporary upload', error);
      }
    }
    tempUploadRef.current = null;
    pendingFileNameRef.current = null;
    revokeObjectUrl(objectUrlRef.current);
    objectUrlRef.current = null;
  }, [deleteTempProfileImage, revokeObjectUrl]);

  const clearSelectionState = useCallback(() => {
    dragStateRef.current = null;
    setIsSelectionDragging(false);
    setCropImageSrc(null);
    setImageInfo(null);
    setSelection(null);
  }, []);

  const resetDialogState = useCallback(() => {
    clearSelectionState();
    setIsDialogOpen(false);
    setIsPreparingImage(false);
    setIsCropping(false);
    setIsFileDragging(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [clearSelectionState]);

  useEffect(() => {
    return () => {
      void disposeTempResources();
    };
  }, [disposeTempResources]);

  useEffect(() => {
    if (!cropImageSrc) {
      setImageInfo(null);
      setSelection(null);
      return;
    }

    let cancelled = false;
    const image = new globalThis.Image();
    image.setAttribute('crossOrigin', 'anonymous');
    image.onload = () => {
      if (cancelled) {
        return;
      }

      const naturalWidth = image.width;
      const naturalHeight = image.height;
      const scale = Math.min(1, cropSize / naturalWidth, cropSize / naturalHeight);
      const renderWidth = naturalWidth * scale;
      const renderHeight = naturalHeight * scale;
      const offsetX = (cropSize - renderWidth) / 2;
      const offsetY = (cropSize - renderHeight) / 2;
      const maxSelectionSize = Math.min(renderWidth, renderHeight);
      const initialSize = Math.min(maxSelectionSize, Math.max(maxSelectionSize * 0.6, 120));
      const initialX = offsetX + (renderWidth - initialSize) / 2;
      const initialY = offsetY + (renderHeight - initialSize) / 2;

      setImageInfo({
        naturalWidth,
        naturalHeight,
        renderWidth,
        renderHeight,
        offsetX,
        offsetY,
      });
      setSelection({
        x: initialX,
        y: initialY,
        size: initialSize,
      });
    };
    image.onerror = (error) => {
      console.error('Failed to load image for cropping', error);
      toast({
        title: texts.errorTitle,
        description: texts.errorDescription,
        variant: 'destructive',
      });
      void (async () => {
        await disposeTempResources();
        resetDialogState();
      })();
    };
    image.src = cropImageSrc;

    return () => {
      cancelled = true;
    };
  }, [cropImageSrc, disposeTempResources, resetDialogState, texts.errorDescription, texts.errorTitle, toast]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (
        !fileList ||
        fileList.length === 0 ||
        busyWithTempUpload ||
        isCropping ||
        isFinalUploading ||
        disabled
      ) {
        return;
      }

      const file = fileList[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: texts.unsupportedTitle,
          description: texts.unsupportedDescription,
          variant: 'destructive',
        });
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      pendingFileNameRef.current = file.name;
      setIsDialogOpen(true);
      setIsPreparingImage(true);

      try {
        await disposeTempResources();
        clearSelectionState();

        const formData = new FormData();
        formData.append('file', file);
        const temporaryUpload = await uploadTempProfileImage(formData).unwrap();
        tempUploadRef.current = temporaryUpload;

        const response = await fetch(temporaryUpload.url, { credentials: 'omit' });
        if (!response.ok) {
          throw new Error(`Failed to fetch temporary upload (status ${response.status})`);
        }

        const blob = await response.blob();
        revokeObjectUrl(objectUrlRef.current);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setCropImageSrc(objectUrl);
      } catch (error) {
        console.error('Failed to prepare image for cropping', error);
        toast({
          title: texts.errorTitle,
          description: texts.errorDescription,
          variant: 'destructive',
        });
        await disposeTempResources();
        resetDialogState();
      } finally {
        setIsPreparingImage(false);
      }
    },
    [
      busyWithTempUpload,
      clearSelectionState,
      disposeTempResources,
      disabled,
      isCropping,
      isFinalUploading,
      resetDialogState,
      texts.errorDescription,
      texts.errorTitle,
      texts.unsupportedDescription,
      texts.unsupportedTitle,
      toast,
      uploadTempProfileImage,
      revokeObjectUrl,
    ],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled || busyWithTempUpload || isDialogOpen || isFinalUploading) {
        return;
      }
      setIsFileDragging(false);
      const { files } = event.dataTransfer;
      void handleFiles(files);
    },
    [busyWithTempUpload, disabled, handleFiles, isDialogOpen, isFinalUploading],
  );

  const handleSelectionSizeChange = useCallback(
    (value: number) => {
      if (!selection || !imageInfo) {
        return;
      }

      const { min, max } = selectionSizeLimits;
      const targetSize = clamp(value, min, max);
      const centerX = selection.x + selection.size / 2;
      const centerY = selection.y + selection.size / 2;
      const nextX = centerX - targetSize / 2;
      const nextY = centerY - targetSize / 2;
      const clamped = clampSelectionPosition(nextX, nextY, targetSize);

      setSelection({
        x: clamped.x,
        y: clamped.y,
        size: targetSize,
      });
    },
    [clampSelectionPosition, imageInfo, selection, selectionSizeLimits],
  );

  const handleSelectionPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!selection || !cropContainerRef.current || isCropping) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      cropContainerRef.current.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: selection.x,
        originY: selection.y,
        size: selection.size,
      };
      setIsSelectionDragging(true);
    },
    [isCropping, selection],
  );

  const handleContainerPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const tentativeX = dragState.originX + deltaX;
    const tentativeY = dragState.originY + deltaY;
    const clamped = clampSelectionPosition(tentativeX, tentativeY, dragState.size);

    setSelection((prev) =>
      prev
        ? {
            x: clamped.x,
            y: clamped.y,
            size: prev.size,
          }
        : prev,
    );
  }, [clampSelectionPosition]);

  const handleContainerPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      setIsSelectionDragging(false);
    }
    const container = cropContainerRef.current;
    container?.releasePointerCapture(event.pointerId);
  }, []);

  const handleCancel = useCallback(async () => {
    await disposeTempResources();
    resetDialogState();
  }, [disposeTempResources, resetDialogState]);

  const handleCropConfirm = useCallback(async () => {
    if (!cropImageSrc || !imageInfo || !selection) {
      return;
    }

    const { naturalWidth, naturalHeight, renderWidth, renderHeight, offsetX, offsetY } = imageInfo;
    const ratioX = naturalWidth / renderWidth;
    const ratioY = naturalHeight / renderHeight;
    const cropArea: CropArea = {
      x: Math.round((selection.x - offsetX) * ratioX),
      y: Math.round((selection.y - offsetY) * ratioY),
      width: Math.round(selection.size * ratioX),
      height: Math.round(selection.size * ratioY),
    };

    setIsCropping(true);
    try {
      const croppedBlob = await getCroppedImage(cropImageSrc, cropArea);
      if (!croppedBlob) {
        throw new Error('Cropping failed to produce an image blob');
      }

      const baseName =
        pendingFileNameRef.current?.replace(/\.[^/.]+$/, '')?.trim() || 'profile-image';
      const croppedFile = new File([croppedBlob], `${baseName}.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', croppedFile);

      const upload = await uploadProfileImage(formData).unwrap();
      onChange(upload.url);
      toast({
        title: texts.successTitle,
        description: texts.successDescription,
      });
      await disposeTempResources();
      resetDialogState();
    } catch (error) {
      console.error('Failed to crop profile image', error);
      toast({
        title: texts.errorTitle,
        description: texts.errorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsCropping(false);
    }
  }, [
    cropImageSrc,
    disposeTempResources,
    imageInfo,
    onChange,
    resetDialogState,
    selection,
    texts.errorDescription,
    texts.errorTitle,
    texts.successDescription,
    texts.successTitle,
    toast,
    uploadProfileImage,
  ]);

  return (
    <>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base font-semibold">{texts.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          <div
            className={cn(
              'relative flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/60 bg-muted/30 p-6 text-center transition-colors',
              isFileDragging && 'border-primary bg-primary/10',
              (disabled || isFinalUploading || busyWithTempUpload) && 'cursor-not-allowed opacity-70',
            )}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              if (disabled || busyWithTempUpload || isDialogOpen || isFinalUploading) {
                return;
              }
              event.dataTransfer.dropEffect = 'copy';
              setIsFileDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsFileDragging(false);
            }}
            role="presentation"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleFiles(event.target.files);
              }}
              disabled={disabled || busyWithTempUpload || isFinalUploading}
            />
            {preview ? (
              <div className="relative size-32 overflow-hidden rounded-lg border border-border/70 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Profile preview" className="size-full object-cover" />
              </div>
            ) : (
              <CloudUpload className="mb-4 size-10 text-muted-foreground" aria-hidden />
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{texts.callToAction}</p>
              <p>{texts.helper}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busyWithTempUpload || isFinalUploading}
            >
              {busyWithTempUpload || isFinalUploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {texts.uploading}
                </>
              ) : (
                texts.select
              )}
            </Button>
          </div>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => onChange(null)}
              disabled={disabled || busyWithTempUpload || isFinalUploading}
            >
              <Trash2 className="mr-2 size-4" />
              {texts.remove}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (!isCropping && !busyWithTempUpload) {
              void handleCancel();
            }
            return;
          }
          setIsDialogOpen(true);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{texts.modalTitle}</DialogTitle>
            <DialogDescription>{texts.modalDescription}</DialogDescription>
          </DialogHeader>
          <div
            ref={cropContainerRef}
            className={cn(
              'relative mx-auto flex size-[320px] select-none items-center justify-center overflow-hidden rounded-lg bg-muted',
              (isCropping || busyWithTempUpload) && 'cursor-progress',
            )}
            style={{ touchAction: 'none' }}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
            onPointerCancel={handleContainerPointerUp}
          >
            {busyWithTempUpload ? (
              <div className="flex size-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : null}
            {!busyWithTempUpload && cropImageSrc && imageInfo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  className="pointer-events-none select-none"
                  style={{
                    position: 'absolute',
                    top: imageInfo.offsetY,
                    left: imageInfo.offsetX,
                    width: imageInfo.renderWidth,
                    height: imageInfo.renderHeight,
                    userSelect: 'none',
                  }}
                />
                {selection ? (
                  <>
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
                      onPointerDown={handleSelectionPointerDown}
                    />
                  </>
                ) : null}
                {selection ? (
                  <>
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
                        bottom: cropSize - (selection.y + selection.size),
                        left: 0,
                        width: selection.x,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute bg-black/40"
                      style={{
                        top: selection.y,
                        bottom: cropSize - (selection.y + selection.size),
                        left: selection.x + selection.size,
                        right: 0,
                      }}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="crop-size">
              {texts.zoomLabel}
            </label>
            <input
              id="crop-size"
              type="range"
              min={Math.round(selectionSizeLimits.min)}
              max={Math.round(selectionSizeLimits.max)}
              step={1}
              value={selection ? Math.round(selection.size) : Math.round(selectionSizeLimits.max)}
              onChange={(event) => handleSelectionSizeChange(Number(event.target.value))}
              disabled={isCropping || busyWithTempUpload || !selection}
              className="h-2 w-full cursor-pointer rounded-full bg-muted accent-primary"
            />
            <p className="text-xs text-muted-foreground">{texts.modalDescription}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleCancel();
              }}
              disabled={isCropping || busyWithTempUpload}
            >
              {texts.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleCropConfirm();
              }}
              disabled={isCropping || busyWithTempUpload || !selection}
            >
              {isCropping ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {texts.uploading}
                </>
              ) : (
                texts.confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
