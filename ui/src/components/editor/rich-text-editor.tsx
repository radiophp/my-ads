'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { $generateHtmlFromNodes } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { ImageNode } from './image-node';

import { cn } from '@/lib/utils';

import { editorTheme } from './rich-text-editor-theme';
import { ToolbarPlugin } from './toolbar-plugin';
import { ImagesPlugin } from './images-plugin';
import { InitialHtmlPlugin } from './initial-html-plugin';

type RichTextEditorProps = {
  initialHtml?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({ initialHtml, onChange, placeholder, className }: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'news-editor',
    theme: editorTheme,
    nodes: [
      HeadingNode,
      QuoteNode,
      CodeNode,
      HorizontalRuleNode,
      LinkNode,
      ListNode,
      ListItemNode,
      ImageNode,
    ],
    onError: (error: Error) => {
      console.error(error);
    },
  };

  return (
    <div className={cn('overflow-hidden rounded-md border border-border/60 bg-background', className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative p-3">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="max-h-[420px] min-h-[220px] overflow-y-auto outline-none" />
            }
            placeholder={
              placeholder ? (
                <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                  {placeholder}
                </div>
              ) : null
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <LinkPlugin />
          <HorizontalRulePlugin />
          <ImagesPlugin />
          <InitialHtmlPlugin html={initialHtml} />
          <OnChangePlugin
            onChange={(editorState, editor) => {
              editorState.read(() => {
                const html = $generateHtmlFromNodes(editor);
                onChange(html);
              });
            }}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
