/* eslint-disable @next/next/no-img-element */
'use client';

import type { ReactNode } from 'react';
import {
  $applyNodeReplacement,
  createCommand,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type EditorConfig,
  type LexicalCommand,
  type NodeKey,
  type SerializedLexicalNode,
} from 'lexical';

export type ImagePayload = {
  src: string;
  altText: string;
};

type SerializedImageNode = {
  src: string;
  altText: string;
} & SerializedLexicalNode;

const convertImageElement = (domNode: HTMLElement): DOMConversionOutput | null => {
  if (domNode instanceof HTMLImageElement && domNode.src) {
    const node = $createImageNode({ src: domNode.src, altText: domNode.alt || '' });
    return { node };
  }
  return null;
};

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __altText: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({ src: serializedNode.src, altText: serializedNode.altText });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 1,
      }),
    };
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  exportDOM(): { element: HTMLElement } {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    if (this.__altText) {
      element.setAttribute('alt', this.__altText);
    }
    element.className = 'max-w-full rounded-md border border-border/60';
    return { element };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = config.theme?.image ?? '';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): ReactNode {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        className="max-w-full rounded-md border border-border/60"
      />
    );
  }
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

export const $createImageNode = (payload: ImagePayload): ImageNode =>
  $applyNodeReplacement(new ImageNode(payload.src, payload.altText));
