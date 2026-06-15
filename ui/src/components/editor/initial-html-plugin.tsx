'use client';

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type LexicalNode,
} from 'lexical';

type InitialHtmlPluginProps = {
  html?: string;
};

export function InitialHtmlPlugin({ html }: InitialHtmlPluginProps) {
  const [editor] = useLexicalComposerContext();
  const lastHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    if (html === undefined || html === lastHtmlRef.current) {
      return;
    }

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      if (!html) {
        root.append($createParagraphNode());
        return;
      }

      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      const safeNodes: LexicalNode[] = [];
      let pendingParagraph: ReturnType<typeof $createParagraphNode> | null = null;

      const flushParagraph = () => {
        if (pendingParagraph) {
          safeNodes.push(pendingParagraph);
          pendingParagraph = null;
        }
      };

      nodes.forEach((node) => {
        if ($isElementNode(node) || $isDecoratorNode(node)) {
          flushParagraph();
          safeNodes.push(node);
          return;
        }

        if ($isTextNode(node) || $isLineBreakNode(node)) {
          if (!pendingParagraph) {
            pendingParagraph = $createParagraphNode();
          }
          pendingParagraph.append(node);
          return;
        }

        if (!pendingParagraph) {
          pendingParagraph = $createParagraphNode();
        }
        pendingParagraph.append($createTextNode(node.getTextContent()));
      });

      flushParagraph();
      const finalNodes = safeNodes.filter((node) => $isElementNode(node) || $isDecoratorNode(node));
      if (finalNodes.length === 0) {
        root.append($createParagraphNode());
      } else {
        root.append(...finalNodes);
      }
    });

    lastHtmlRef.current = html ?? '';
  }, [editor, html]);

  return null;
}
