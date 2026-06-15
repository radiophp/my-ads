'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { INSERT_IMAGE_COMMAND, $createImageNode, type ImagePayload } from './image-node';

export function ImagesPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
        } else {
          $getRoot().append(imageNode);
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
