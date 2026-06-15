'use client';

import { type JSX, useEffect, useState } from 'react';
import type { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

type InlineNoteEditorProps = {
  noteContent: string | null;
  isRTL: boolean;
  t: ReturnType<typeof useTranslations>;
  onSave: (content: string) => Promise<void>;
  editTrigger?: number;
};

export function InlineNoteEditor({ noteContent, isRTL, t, onSave, editTrigger = 0 }: InlineNoteEditorProps): JSX.Element | null {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(noteContent ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(noteContent ?? '');
    }
  }, [noteContent, isEditing]);

  useEffect(() => {
    if (editTrigger > 0) {
      setDraft(noteContent ?? '');
      setIsEditing(true);
    }
  }, [editTrigger, noteContent]);

  const canSave = draft.trim() !== (noteContent ?? '').trim();

  const handleStartEdit = () => {
    setDraft(noteContent ?? '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(noteContent ?? '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft.trim());
      setIsEditing(false);
    } catch {
      setIsSaving(false);
    }
  };

  if (!noteContent && !isEditing) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">{t('noteSection.heading')}</p>
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('noteSection.cancel')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="flex items-center gap-1"
          >
            <span className="sr-only">{t('noteSection.editButton')}</span>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <>
          <textarea
            className="mt-3 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            placeholder={t('noteSection.placeholder')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
          />
          <div className={cn('mt-3 flex', isRTL ? 'justify-start' : 'justify-end')}>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? t('noteSection.saving') : t('noteSection.save')}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{noteContent}</p>
      )}
    </div>
  );
}
