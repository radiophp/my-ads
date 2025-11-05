'use client';

import type { JSX } from 'react';

import { Toast, ToastAction, ToastCloseButton, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast';
import { useToast } from './use-toast';

export function Toaster(): JSX.Element {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...toast }) => (
        <Toast key={id} variant={variant} {...toast}>
          <div className="grid gap-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          {action ? <ToastAction altText="Action" asChild>{action}</ToastAction> : null}
          <ToastCloseButton />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
