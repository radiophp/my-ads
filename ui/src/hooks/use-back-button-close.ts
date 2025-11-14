import { useEffect, useRef } from 'react';

type StackEntry = {
  id: number;
  close: () => void;
  popped: boolean;
  manualClose: boolean;
};

const modalStack: StackEntry[] = [];
let listenerAttached = false;

const supportsHistory = (): boolean =>
  typeof window !== 'undefined' && typeof window.history !== 'undefined';

const handlePopState = () => {
  const entry = modalStack.pop();
  if (!entry) {
    if (listenerAttached && supportsHistory()) {
      window.removeEventListener('popstate', handlePopState);
      listenerAttached = false;
    }
    return;
  }
  entry.popped = true;
  if (!entry.manualClose) {
    entry.close();
  } else {
    entry.manualClose = false;
  }
  if (modalStack.length === 0 && supportsHistory()) {
    window.removeEventListener('popstate', handlePopState);
    listenerAttached = false;
  }
};

export function useBackButtonClose(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const entryRef = useRef<StackEntry | null>(null);

  useEffect(() => {
    if (!open || !supportsHistory()) {
      return;
    }

    const entry: StackEntry = {
      id: Date.now() + Math.random(),
      close: () => closeRef.current?.(),
      popped: false,
      manualClose: false,
    };

    const wasEmpty = modalStack.length === 0;
    modalStack.push(entry);
    if (wasEmpty) {
      window.addEventListener('popstate', handlePopState);
      listenerAttached = true;
    }

    try {
      window.history.pushState({ __modalBack: entry.id }, '', window.location.href);
      entryRef.current = entry;
    } catch {
      modalStack.pop();
      if (wasEmpty) {
        window.removeEventListener('popstate', handlePopState);
        listenerAttached = false;
      }
      return;
    }

    return () => {
      if (!entryRef.current) {
        return;
      }

      const currentEntry = entryRef.current;
      if (currentEntry.popped) {
        entryRef.current = null;
        if (modalStack.length === 0 && supportsHistory()) {
          window.removeEventListener('popstate', handlePopState);
        }
        return;
      }

      currentEntry.manualClose = true;
      entryRef.current = null;
      try {
        window.history.back();
      } catch {
        // ignored
      }
    };
  }, [open]);
}
