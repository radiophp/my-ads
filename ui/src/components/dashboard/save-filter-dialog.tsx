'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type SaveFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  submitLabel: string;
  cancelLabel: string;
  loading: boolean;
  defaultName?: string;
  onSubmit: (name: string) => Promise<void> | void;
};

export function SaveFilterDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  submitLabel,
  cancelLabel,
  loading,
  defaultName,
  onSubmit,
}: SaveFilterDialogProps) {
  const [name, setName] = useState(defaultName ?? '');

  useEffect(() => {
    if (open) {
      setName(defaultName ?? '');
    }
  }, [open, defaultName]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || loading) {
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground">
            <span className="sr-only">{title}</span>
            <Input
              value={name}
              placeholder={placeholder}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </label>
        </div>
        <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={loading || name.trim().length === 0}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
