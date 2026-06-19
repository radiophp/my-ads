/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

type LoadingLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function LoadingLogo({ size = 'sm', className }: LoadingLogoProps) {
  const sizeClasses = {
    sm: 'size-5',
    md: 'size-10',
    lg: 'size-32',
  };
  const animation = size === 'lg' ? 'animate-splash-float' : 'animate-pulse';

  return (
    <img
      src="/fav/android-chrome-192x192.png"
      alt=""
      className={cn(sizeClasses[size], animation, className)}
    />
  );
}
