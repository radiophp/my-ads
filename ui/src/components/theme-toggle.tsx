'use client';

import { Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ui-theme';

type Theme = 'light' | 'dark';

type StoredTheme = Theme | null;

function getStoredTheme(): StoredTheme {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

type ThemeToggleProps = React.ComponentPropsWithoutRef<typeof Button>;

export const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle(
  { className, ...props },
  ref,
) {
  const [theme, setTheme] = React.useState<Theme>('light');
  const [mounted, setMounted] = React.useState(false);
  const [userOverride, setUserOverride] = React.useState(false);
  const t = useTranslations('header');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
      setUserOverride(true);
      applyTheme(stored);
    } else {
      const system = getSystemTheme();
      setTheme(system);
      applyTheme(system);
    }
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mounted) return;
    applyTheme(theme);
    if (userOverride) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, mounted, userOverride]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userOverride) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [userOverride]);

  const renderedTheme = mounted ? theme : 'light';
  const isDark = renderedTheme === 'dark';

  const toggleTheme = () => {
    setUserOverride(true);
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={t('themeToggle')}
      onClick={toggleTheme}
      className={cn('size-9', className)}
      {...props}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
});
