'use client';

import { useCallback, useRef, useState } from 'react';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useUploadPublicImageMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type NewsImageUploaderProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function NewsImageUploader({ value, onChange, disabled = false }: NewsImageUploaderProps) {
  const t = useTranslations('admin.news.image');
  const { toast } = useToast();
  const [uploadPublicImage, { isLoading }] = useUploadPublicImageMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await uploadPublicImage(formData).unwrap();
        onChange(response.url);
      } catch (error) {
        toast({
          title: t('error'),
          variant: 'destructive',
        });
        console.error(error);
      } finally {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [onChange, t, toast, uploadPublicImage],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled || isLoading) {
        return;
      }
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('error'),
          variant: 'destructive',
        });
        return;
      }
      void handleUpload(file);
    },
    [disabled, handleUpload, isLoading, t, toast],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled || isLoading) return;
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles, isLoading],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{t('title')}</label>
      <div
        className={cn(
          'relative flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/60 bg-muted/30 p-4 text-center transition-colors',
          isDragging && 'border-primary bg-primary/10',
          (disabled || isLoading) && 'cursor-not-allowed opacity-70',
        )}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          if (disabled || isLoading) return;
          event.dataTransfer.dropEffect = 'copy';
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        role="presentation"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
          disabled={disabled || isLoading}
        />
        {value ? (
          <div className="relative size-24 overflow-hidden rounded-lg border border-border/70 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={t('previewAlt')} className="size-full object-cover" />
          </div>
        ) : (
          <CloudUpload className="mb-4 size-10 text-muted-foreground" aria-hidden />
        )}
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t('cta')}</p>
          <p>{t('helper')}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('uploading')}
            </>
          ) : (
            t('select')
          )}
        </Button>
      </div>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => onChange(null)}
          disabled={disabled || isLoading}
        >
          <Trash2 className="mr-2 size-4" />
          {t('remove')}
        </Button>
      ) : null}
    </div>
  );
}
