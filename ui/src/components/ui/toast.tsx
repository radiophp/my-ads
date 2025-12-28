 'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => {
  const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr');

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const docDir = document.documentElement.getAttribute('dir');
      setDir(docDir === 'rtl' ? 'rtl' : 'ltr');
    }
  }, []);

  const positionClass =
    dir === 'rtl'
      ? 'lg:left-6 lg:right-auto lg:bottom-6 lg:top-auto'
      : 'lg:right-6 lg:top-6';

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        'fixed inset-x-0 top-0 z-[100] flex max-h-screen w-screen flex-col gap-2 p-0 lg:inset-auto lg:w-full lg:max-w-sm lg:p-4',
        positionClass,
        className,
      )}
      {...props}
    />
  );
});
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-none border-0 border-b border-border bg-muted/80 p-4 shadow-lg transition-all touch-pan-y select-none lg:rounded-xl lg:border lg:border-border lg:bg-background',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        destructive: 'bg-destructive text-destructive-foreground border-destructive/50 lg:border-destructive/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const SWIPE_ACTIVATE_PX = 12;
const SWIPE_DISMISS_PX = 90;

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest('button, a, [role="button"], input, textarea, select, [toast-close], [data-toast-no-swipe]'),
  );
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...props }, ref) => {
  const swipeState = React.useRef({
    active: false,
    swiping: false,
    preventClick: false,
    startX: 0,
    startY: 0,
  });
  const [offsetX, setOffsetX] = React.useState(0);

  const handlePointerDown = (event: React.PointerEvent<HTMLLIElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      onPointerDown?.(event);
      return;
    }
    if (isInteractiveTarget(event.target)) {
      onPointerDown?.(event);
      return;
    }
    swipeState.current = {
      active: true,
      swiping: false,
      preventClick: false,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onPointerDown?.(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLLIElement>) => {
    if (!swipeState.current.active) {
      onPointerMove?.(event);
      return;
    }
    const dx = event.clientX - swipeState.current.startX;
    const dy = event.clientY - swipeState.current.startY;
    if (!swipeState.current.swiping) {
      if (Math.abs(dx) < SWIPE_ACTIVATE_PX) {
        onPointerMove?.(event);
        return;
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        swipeState.current.active = false;
        swipeState.current.swiping = false;
        swipeState.current.preventClick = false;
        setOffsetX(0);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        onPointerMove?.(event);
        return;
      }
      swipeState.current.swiping = true;
      swipeState.current.preventClick = true;
    }
    if (swipeState.current.swiping) {
      setOffsetX(dx);
    }
    onPointerMove?.(event);
  };

  const finishPointer = (event: React.PointerEvent<HTMLLIElement>) => {
    if (!swipeState.current.active) {
      onPointerUp?.(event);
      onPointerCancel?.(event);
      return;
    }
    const dx = event.clientX - swipeState.current.startX;
    if (swipeState.current.swiping && Math.abs(dx) > SWIPE_DISMISS_PX) {
      props.onOpenChange?.(false);
    } else {
      setOffsetX(0);
    }
    swipeState.current.active = false;
    swipeState.current.swiping = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    onPointerUp?.(event);
    onPointerCancel?.(event);
  };

  const handleClick = (event: React.MouseEvent<HTMLLIElement>) => {
    if (swipeState.current.preventClick) {
      swipeState.current.preventClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      style={offsetX ? { transform: `translateX(${offsetX}px)` } : undefined}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = ToastPrimitives.Action;
const ToastClose = ToastPrimitives.Close;
const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastCloseButton = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, onClick, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'toast-close-button absolute top-3 hidden rounded-md p-1 text-muted-foreground transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:inline-flex',
      className,
    )}
    toast-close=""
    onClick={(event) => {
      event.stopPropagation();
      onClick?.(event);
    }}
    {...props}
  >
    <X className="size-4" />
  </ToastPrimitives.Close>
));
ToastCloseButton.displayName = ToastPrimitives.Close.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastCloseButton,
};
