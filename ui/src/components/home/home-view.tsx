'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { JSX } from 'react';

import { OnboardingForm } from '@/components/forms/onboarding-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Link } from '@/i18n/routing';
import { CounterWidget } from '@/features/counter/components/counter-widget';
import { useGetHealthQuery } from '@/features/api/apiSlice';

export function HomeView(): JSX.Element {
  const { data, isFetching, isError } = useGetHealthQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('home');

  const rawStatus = (data?.status as 'healthy' | undefined) ?? undefined;
  const normalizedStatus: 'healthy' | 'unknown' = rawStatus === 'healthy' ? 'healthy' : 'unknown';
  const statusKey: 'healthy' | 'unavailable' | 'checking' | 'unknown' = isError
    ? 'unavailable'
    : isFetching
      ? 'checking'
      : normalizedStatus;

  return (
    <div className="space-y-12">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-3xl border border-border p-10 shadow-xl transition-colors"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="size-4" />
              {t('badge')}
            </div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{t('heroTitle')}</h1>
            <p className="max-w-2xl text-base text-muted-foreground">{t('heroDescription')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/docs/getting-started" className="flex items-center gap-2">
                  {t('ctaDocs')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">{t('ctaQuickStart')}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('ctaQuickStart')}</DialogTitle>
                    <DialogDescription className="space-y-2 text-sm">
                      <span>{t('quickStart.commandsIntro')}</span>
                      <pre className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        <code>{`npm install
npm run dev`}</code>
                      </pre>
                      <span className="block text-muted-foreground">
                        {t.rich('quickStart.envHint', {
                          file: (chunks) => <code>{chunks}</code>,
                          variable: (chunks) => <code>{chunks}</code>,
                        })}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                onClick={() =>
                  toast({
                    title: t('tokensToast.title'),
                    description: t('tokensToast.description'),
                  })
                }
              >
                {t('copyTokens')}
              </Button>
            </div>
          </div>
          <div className="bg-card w-full max-w-xs rounded-2xl border border-border p-4 text-sm transition-colors">
            <p className="text-muted-foreground">{t('apiHealth.title')}</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <span className={isError ? 'text-destructive' : 'text-success'}>
                {t(`apiHealth.status.${statusKey}`)}
              </span>
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {t.rich('apiHealth.hint', {
                code: (chunks) => <code>{chunks}</code>,
              })}
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <OnboardingForm />
        <CounterWidget />
      </div>
    </div>
  );
}
