'use client';

import { useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Indent,
  Italic,
  ChevronDown,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Outdent,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';

import { useUploadPublicImageMutation } from '@/features/api/endpoints/uploads';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { normalizeStorageUrl } from '@/lib/storage';
import { INSERT_IMAGE_COMMAND } from './image-node';

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();
  const [uploadPublicImage, { isLoading: isUploading }] = useUploadPublicImageMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const appBase = process.env.NEXT_PUBLIC_APP_URL;

  const applyBlockType = useCallback(
    (type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        switch (type) {
          case 'paragraph':
            $setBlocksType(selection, () => $createParagraphNode());
            break;
          case 'h1':
            $setBlocksType(selection, () => $createHeadingNode('h1'));
            break;
          case 'h2':
            $setBlocksType(selection, () => $createHeadingNode('h2'));
            break;
          case 'h3':
            $setBlocksType(selection, () => $createHeadingNode('h3'));
            break;
          case 'quote':
            $setBlocksType(selection, () => $createQuoteNode());
            break;
          case 'code':
            $setBlocksType(selection, () => $createCodeNode());
            break;
          default:
            break;
        }
      });
    },
    [editor],
  );

  const promptForLink = useCallback(() => {
    let hasSelection = false;
    let hasLink = false;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }
      hasSelection = true;
      hasLink = selection.getNodes().some((node) => node.getType() === 'link');
    });

    if (!hasSelection) return;

    const url = window.prompt('لینک را وارد کنید', hasLink ? '' : 'https://');
    if (!url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  }, [editor]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await uploadPublicImage(formData).unwrap();
      const normalizedUrl = normalizeStorageUrl(response.url, appBase) ?? response.url;
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: normalizedUrl,
        altText: file.name,
      });
    } catch (error) {
      toast({
        title: 'خطا در بارگذاری تصویر',
        description: 'امکان آپلود تصویر وجود ندارد. دوباره تلاش کنید.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <Pilcrow className="size-4" aria-hidden />
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => applyBlockType('paragraph')}>
              <Pilcrow className="mr-2 size-4" aria-hidden />
              متن
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlockType('h1')}>
              <Heading1 className="mr-2 size-4" aria-hidden />
              تیتر ۱
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlockType('h2')}>
              <Heading2 className="mr-2 size-4" aria-hidden />
              تیتر ۲
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlockType('h3')}>
              <Heading3 className="mr-2 size-4" aria-hidden />
              تیتر ۳
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlockType('quote')}>
              <Quote className="mr-2 size-4" aria-hidden />
              نقل‌قول
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlockType('code')}>
              <Code className="mr-2 size-4" aria-hidden />
              کد
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="h-6 w-px bg-border/60" aria-hidden />
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        >
          <Bold className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        >
          <Italic className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        >
          <Underline className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        >
          <Strikethrough className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={promptForLink}
        >
          <Link2 className="size-4" aria-hidden />
        </Button>
      </div>
      <span className="h-6 w-px bg-border/60" aria-hidden />
      <div className="flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <List className="size-4" aria-hidden />
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
              <List className="mr-2 size-4" aria-hidden />
              لیست بولت
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
              <ListOrdered className="mr-2 size-4" aria-hidden />
              لیست عددی
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}>
              <ListChecks className="mr-2 size-4" aria-hidden />
              چک‌لیست
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="h-6 w-px bg-border/60" aria-hidden />
      <div className="flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <AlignLeft className="size-4" aria-hidden />
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}>
              <AlignLeft className="mr-2 size-4" aria-hidden />
              چپ‌چین
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}>
              <AlignCenter className="mr-2 size-4" aria-hidden />
              وسط‌چین
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}>
              <AlignRight className="mr-2 size-4" aria-hidden />
              راست‌چین
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}>
              <AlignJustify className="mr-2 size-4" aria-hidden />
              تمام‌چین
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
              <Indent className="mr-2 size-4" aria-hidden />
              تو رفتگی
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
              <Outdent className="mr-2 size-4" aria-hidden />
              کاهش تو رفتگی
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="h-6 w-px bg-border/60" aria-hidden />
      <div className="flex flex-wrap items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <ImageIcon className="size-4" aria-hidden />
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <ImageIcon className="mr-2 size-4" aria-hidden />
              تصویر
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
              <Minus className="mr-2 size-4" aria-hidden />
              جداکننده
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="h-6 w-px bg-border/60" aria-hidden />
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <Undo2 className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <Redo2 className="size-4" aria-hidden />
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
    </div>
  );
}
