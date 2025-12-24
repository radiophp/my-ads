import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

import { normalizeStorageUrl } from '@/lib/storage';
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

function AvatarImage({ className, alt, src: rawSrc, ...props }: AvatarImageProps) {
  const appBase = process.env.NEXT_PUBLIC_APP_URL;
  const src =
    typeof rawSrc === 'string' ? normalizeStorageUrl(rawSrc, appBase) ?? rawSrc : rawSrc;

  return (
    <Image
      alt={alt}
      src={src}
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
