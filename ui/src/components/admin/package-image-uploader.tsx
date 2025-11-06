'use client';

import { useCallback, useRef, useState, type JSX } from 'react';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUploadPublicImageMutation } from '@/features/api/apiSlice';
import { useToast } from '@/components/ui/use-toast';

type PackageImageTexts = {
  title: string;
  helper: string;
  cta: string;
  select: string;
  uploading: string;
  remove: string;
  error: string;
};

type PackageImageUploaderProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  texts: PackageImageTexts;
};

export function PackageImageUploader({
  value,
  onChange,
  disabled = false,
  texts,
}: PackageImageUploaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPublicImage, { isLoading }] = useUploadPublicImageMutation();
  const { toast } = useToast();

  const handleUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await uploadPublicImage(formData).unwrap();
        onChange(response.url);
      } catch (error) {
        console.error('Failed to upload package image', error);
        toast({
          title: texts.error,
          variant: 'destructive',
        });
      } finally {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    },
    [onChange, texts.error, toast, uploadPublicImage],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled || isLoading) {
        return;
      }
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: texts.error,
          variant: 'destructive',
        });
        return;
      }
      void handleUpload(file);
    },
    [disabled, handleUpload, isLoading, texts.error, toast],
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
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-base font-semibold">{texts.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4">
        <div
          className={cn(
            'relative flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/60 bg-muted/30 p-6 text-center transition-colors',
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
            <div className="relative size-32 overflow-hidden rounded-lg border border-border/70 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Package illustration" className="size-full object-cover" />
            </div>
          ) : (
            <CloudUpload className="mb-4 size-10 text-muted-foreground" aria-hidden />
          )}
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{texts.cta}</p>
            <p>{texts.helper}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {texts.uploading}
              </>
            ) : (
              texts.select
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
            {texts.remove}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
