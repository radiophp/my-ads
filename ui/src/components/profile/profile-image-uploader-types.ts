export type ProfileImageTexts = {
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

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageInfo = {
  naturalWidth: number;
  naturalHeight: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
};

export type SelectionState = {
  x: number;
  y: number;
  size: number;
};

export type TempUploadMetadata = {
  key: string;
  url: string;
  originalName?: string;
};

export const CROP_SIZE = 320;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new globalThis.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export const getCroppedImage = async (imageSrc: string, crop: CropArea): Promise<Blob | null> => {
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
