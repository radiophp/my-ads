'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/hooks';

export function BaleBackButtonHandler() {
  const isBaleMiniApp = useAppSelector((s) => s.auth.isBaleMiniApp);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isBaleMiniApp) return;

    const sdk = window.Bale?.WebApp;
    if (!sdk?.BackButton && typeof sdk?.onEvent !== 'function') return;

    const handleBack = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        sdk.close();
      }
    };

    if (sdk.BackButton) {
      sdk.BackButton.show();
      sdk.BackButton.onClick(handleBack);
      cleanupRef.current = () => {
        sdk.BackButton.offClick(handleBack);
        sdk.BackButton.hide();
      };
    } else {
      sdk.onEvent('backButtonClicked', handleBack);
      cleanupRef.current = () => {
        sdk.offEvent('backButtonClicked', handleBack);
      };
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isBaleMiniApp]);

  return null;
}
