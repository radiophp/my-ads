import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'relative flex size-10 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted',
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

type AvatarImageProps = Omit<ImageProps, 'fill'> & {
  alt: string;
};

function AvatarImage({ className, alt, ...props }: AvatarImageProps) {
  return (
    <Image
      alt={alt}
      fill
      sizes="40px"
      className={cn('object-cover', className)}
      {...props}
    />
  );
}
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
