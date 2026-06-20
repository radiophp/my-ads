'use client';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

import { UserMenu } from '@/components/layout/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { usePwaPrompt } from '@/hooks/usePwaPrompt';
import { Link } from '@/i18n/routing';
import {
  useGetNotificationsQuery,
} from '@/features/api/endpoints/notifications';
import { useGetRingBinderFoldersQuery } from '@/features/api/endpoints/ring-binder';
import { useLogoutMutation } from '@/features/api/endpoints/auth';
import { clearAuth } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import type { RingBinderFolder } from '@/types/ring-binder';
import {
  Menu,
  X,
  DownloadCloud,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Home,
  Filter,
  FolderKanban,
  Bookmark,
  Bell,
  BellOff,
  ShieldCheck,
  Newspaper,
  BookOpen,
  Info,
  LogIn,
  Monitor,
} from 'lucide-react';
import { useNotificationsSocket } from '@/features/notifications/useNotificationsSocket';
import { useNotificationPreferences } from '@/features/notifications/useNotificationPreferences';
import { usePushSubscription } from '@/features/notifications/usePushSubscription';
import { selectLatestNotificationTimestamp } from '@/features/notifications/notificationsSlice';
import { CodeSearch } from '@/components/layout/code-search';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { RingBinderNavDropdown } from '@/components/layout/ring-binder-nav-dropdown';
import { ManualInstallDialog } from '@/components/layout/manual-install-dialog';
import { InstalledNoticeDialog } from '@/components/layout/installed-notice-dialog';
import { cn } from '@/lib/utils';

type NavIconKey =
  | 'home'
  | 'dashboard'
  | 'ringBinder'
  | 'savedFilters'
  | 'notifications'
  | 'filters'
  | 'admin'
  | 'news'
  | 'newsBlog'
  | 'blog'
  | 'about'
  | 'login';

type NavItemConfig = {
  key: string;
  label: string;
  href: string;
  visible: boolean;
  icon: NavIconKey;
};

const navIconComponents: Record<NavIconKey, typeof LayoutDashboard> = {
  home: Home,
  dashboard: LayoutDashboard,
  ringBinder: FolderKanban,
  savedFilters: Bookmark,
  notifications: Bell,
  filters: Filter,
  admin: ShieldCheck,
  news: Newspaper,
  newsBlog: Newspaper,
  blog: BookOpen,
  about: Info,
  login: LogIn,
};

function renderNavIcon(icon: NavIconKey, className?: string) {
  const Icon = navIconComponents[icon] ?? LayoutDashboard;
  return <Icon className={cn('size-4 shrink-0 text-muted-foreground', className)} aria-hidden />;
}

export function SiteHeader() {
  const t = useTranslations();
  const pwaT = useTranslations('pwa');
  const notificationsT = useTranslations('dashboard.notificationsPage');
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const latestFromStore = useAppSelector((state) =>
    state.auth.accessToken ? selectLatestNotificationTimestamp(state) : null,
  );
  const { data: latestNotificationData } = useGetNotificationsQuery(
    { limit: 1 },
    { skip: !auth.accessToken },
  );
  const latestFromApi = useMemo(() => {
    const raw = latestNotificationData?.items?.[0]?.createdAt;
    if (!raw) {
      return null;
    }
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }, [latestNotificationData]);
  const latestNotificationAt = useMemo(() => {
    if (latestFromStore && latestFromApi) {
      return Math.max(latestFromStore, latestFromApi);
    }
    return latestFromStore ?? latestFromApi ?? null;
  }, [latestFromApi, latestFromStore]);
  const [notificationClock, setNotificationClock] = useState(() => Date.now());
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const hasRecentNotifications =
    typeof latestNotificationAt === 'number' &&
    notificationClock - latestNotificationAt < FOUR_HOURS_MS;

  useEffect(() => {
    if (!latestNotificationAt) {
      return;
    }
    const now = Date.now();
    setNotificationClock(now);
    const expiresAt = latestNotificationAt + FOUR_HOURS_MS;
    const delay = expiresAt - now;
    if (delay <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setNotificationClock(Date.now());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [latestNotificationAt, FOUR_HOURS_MS]);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { isInstallable, promptInstall, isStandalone, hasRelatedInstall } = usePwaPrompt();
  const [isPromptingInstall, setIsPromptingInstall] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [showInstalledNotice, setShowInstalledNotice] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const {
    realtimeEnabled,
    pushEnabled,
    setPushEnabled,
    setRealtimeEnabled,
  } = useNotificationPreferences();
  const {
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    supported: pushSupported,
    isSubscribing: pushSubscribing,
    isUnsubscribing: pushUnsubscribing,
  } = usePushSubscription();
  const notificationsEnabled = realtimeEnabled && (!pushSupported || pushEnabled);
  const notificationBusy = pushSubscribing || pushUnsubscribing;
  const notificationLabel = notificationsEnabled
    ? notificationsT('all.disable')
    : notificationsT('all.enable');
  const notificationButtonClass = cn(
    'rounded-full transition-colors',
    notificationsEnabled
      ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
      : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  );

  const handleEnableNotifications = async () => {
    if (!auth.accessToken || notificationBusy) {
      return;
    }
    if (notificationsEnabled) {
      return;
    }
    setRealtimeEnabled(true);
    if (!pushSupported) {
      setPushEnabled(false);
      return;
    }
    try {
      await subscribePush();
      setPushEnabled(true);
    } catch (error) {
      setPushEnabled(false);
      toast({
        title: notificationsT('push.errorTitle'),
        description: notificationsT('push.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleDisableNotifications = async () => {
    if (!auth.accessToken || notificationBusy) {
      return;
    }
    setRealtimeEnabled(false);
    setPushEnabled(false);
    if (pushSupported) {
      try {
        await unsubscribePush();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      setDisableConfirmOpen(true);
      return;
    }
    await handleEnableNotifications();
  };

  useNotificationsSocket({
    enabled: realtimeEnabled,
    onNotification: (payload) => {
      const detailHref = payload.post?.id
        ? `/dashboard/posts/${payload.post.id}`
        : '/dashboard/notifications';
      const title = payload.post?.title ?? notificationsT('item.untitled');
      const location = [payload.post?.districtName, payload.post?.cityName, payload.post?.provinceName]
        .filter(Boolean)
        .join('، ');
      const thumbnailUrl = payload.post?.previewImageUrl ?? '/fav/android-chrome-192x192.png';
      const descriptionItems: string[] = [];
      if (payload.filter?.name) {
        descriptionItems.push(notificationsT('item.savedFilter', { name: payload.filter.name }));
      }
      if (location) {
        descriptionItems.push(location);
      }
      const description = (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview can be a third-party URL */}
          <img
            src={thumbnailUrl}
            alt=""
            className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
            loading="lazy"
          />
          <div className="flex flex-col gap-1">
            {descriptionItems.map((item, index) => (
              <span key={`${payload.id}-meta-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      );

      toast({
        title,
        description,
        onClick: () => router.push(detailHref),
        className: 'cursor-pointer',
      });
    },
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isAuthenticated = Boolean(auth.accessToken);
  const showAuthNav = isHydrated && isAuthenticated;
  const showLoginNav = isHydrated && !isAuthenticated;
  const showAdminNav = showAuthNav && auth.user?.role === 'ADMIN';
  const hasExistingInstall = isStandalone || hasRelatedInstall;
  const showInstallButton = !isStandalone;
  const {
    data: ringBinderData,
    isLoading: isRingBinderLoading,
    isError: isRingBinderError,
  } = useGetRingBinderFoldersQuery(undefined, {
    skip: !showAuthNav,
  });
  const ringBinderFolders = ringBinderData?.folders ?? [];

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      dispatch(clearAuth());
      router.push('/');
    }
  };

  const handleInstallClick = async () => {
    if (isPromptingInstall) {
      return;
    }
    if (hasExistingInstall) {
      setShowInstalledNotice(true);
      return;
    }
    if (!isInstallable) {
      setShowManualInstall(true);
      return;
    }
    try {
      setIsPromptingInstall(true);
      const accepted = await promptInstall();
      toast({
        title: accepted ? pwaT('installedTitle') : pwaT('installTitle'),
        description: accepted ? pwaT('installedDescription') : pwaT('installDescription'),
      });
    } catch (error) {
      console.error('Failed to trigger PWA install', error);
      setShowManualInstall(true);
    } finally {
      setIsPromptingInstall(false);
    }
  };

  const availableNavItems: NavItemConfig[] = [
    {
      key: 'home',
      label: t('header.nav.home'),
      href: '/',
      visible: true,
      icon: 'home' as const,
    },
    {
      key: 'dashboard',
      label: t('header.nav.dashboard'),
      href: '/dashboard',
      visible: showAuthNav,
      icon: 'dashboard' as const,
    },
    {
      key: 'ring-binder',
      label: t('header.nav.ringBinder'),
      href: '/dashboard/ring-binder',
      visible: showAuthNav,
      icon: 'ringBinder' as const,
    },
    {
      key: 'saved-filters',
      label: t('header.nav.savedFilters'),
      href: '/dashboard/saved-filters',
      visible: showAuthNav,
      icon: 'savedFilters' as const,
    },
    {
      key: 'notifications',
      label: t('header.nav.notifications'),
      href: '/dashboard/notifications',
      visible: showAuthNav,
      icon: 'notifications' as const,
    },
    {
      key: 'news',
      label: t('header.nav.news'),
      href: '/news',
      visible: true,
      icon: 'news' as const,
    },
    {
      key: 'blog',
      label: t('header.nav.blog'),
      href: '/blog',
      visible: true,
      icon: 'blog' as const,
    },
    {
      key: 'about',
      label: t('header.nav.about'),
      href: '/about',
      visible: false,
      icon: 'about' as const,
    },
    {
      key: 'login',
      label: t('header.nav.login'),
      href: '/login',
      visible: showLoginNav,
      icon: 'login' as const,
    },
  ];

  const userDisplayName = useMemo(() => {
    if (!auth.user) {
      return null;
    }
    const firstName = auth.user.firstName?.trim();
    if (firstName) {
      return firstName;
    }
    const lastName = auth.user.lastName?.trim();
    if (lastName) {
      return lastName;
    }
    return auth.user.phone;
  }, [auth.user]);
  const userAvatar = useMemo(() => {
    const url = auth.user?.profileImageUrl?.trim();
    return url && url.length > 0 ? url : null;
  }, [auth.user?.profileImageUrl]);

  return (
    <header className="sticky top-0 z-40 border-b-0 bg-transparent backdrop-blur-0 transition-colors sm:border-b sm:border-border/60 sm:bg-background/80 sm:backdrop-blur">
      <div className="hidden h-16 w-full items-center justify-between px-4 sm:flex">
        <div className="flex w-full items-center gap-3 sm:w-auto rtl:justify-between sm:rtl:justify-start">
          <button
            type="button"
            className="bg-card inline-flex items-center justify-center rounded-md border border-border/80 px-2.5 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t('header.mobileMenuOpen')}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-mahan-file.png"
              alt={t('header.brand')}
              width={1000}
              height={357}
              className="hidden h-9 w-auto shrink-0 sm:h-12 lg:block"
              priority
            />
            <Image
              src="/fav/android-chrome-192x192.png"
              alt={t('header.brand')}
              width={192}
              height={192}
              className="hidden size-10 shrink-0 sm:block lg:hidden"
              priority
            />
            <span className="sr-only">{t('header.brand')}</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground min-[860px]:inline-flex"
            >
              {renderNavIcon('home', 'hidden lg:block')}
              {t('header.nav.home')}
            </Link>
            {showAuthNav && (
              <Link
                href="/dashboard"
                className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
              >
                {renderNavIcon('dashboard', 'hidden lg:block')}
                {t('header.nav.dashboard')}
              </Link>
            )}
            {showAuthNav && (
              <RingBinderNavDropdown
                label={t('header.nav.ringBinder')}
                manageLabel={t('ringBinder.title')}
                folders={ringBinderFolders}
                isLoading={isRingBinderLoading}
                isError={isRingBinderError}
                loadingLabel={t('dashboard.filters.ringBinder.loading')}
                emptyLabel={t('ringBinder.list.emptyTitle')}
                errorLabel={t('ringBinder.list.error')}
              />
            )}
            {showAuthNav && (
              <Link
                href="/dashboard/saved-filters"
                className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
              >
                {renderNavIcon('savedFilters', 'hidden lg:block')}
                {t('header.nav.savedFilters')}
              </Link>
            )}
            {showAuthNav && (
              <Link
                href="/dashboard/notifications"
                className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
              >
                <span className="relative inline-flex items-center justify-center">
                  {renderNavIcon('notifications', 'hidden lg:block')}
                  {hasRecentNotifications && (
                    <span
                      className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive shadow"
                      aria-hidden
                    />
                  )}
                </span>
                {t('header.nav.notifications')}
              </Link>
            )}
            <Link
              href="/news"
              className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {renderNavIcon('news', 'hidden lg:block')}
              {t('header.nav.news')}
            </Link>
            <Link
              href="/blog"
              className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {renderNavIcon('blog', 'hidden lg:block')}
              {t('header.nav.blog')}
            </Link>
            {showLoginNav ? (
              <Link
                href="/about"
                className="items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
              >
                {renderNavIcon('about', 'hidden lg:block')}
                {t('header.nav.about')}
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {showInstallButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInstallClick}
              disabled={isPromptingInstall}
              className="flex items-center gap-2 border-0 px-3"
            >
              <DownloadCloud className="size-4" aria-hidden />
              <span className="sr-only lg:not-sr-only">
                {isPromptingInstall ? pwaT('installingLabel') : t('header.installApp')}
              </span>
            </Button>
          ) : null}
          {showAuthNav ? <CodeSearch /> : null}
          {showLoginNav ? <ThemeToggle /> : null}
          {showLoginNav ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground"
            >
              {renderNavIcon('login', 'hidden lg:block')}
              {t('header.nav.login')}
            </Link>
          ) : null}
          {showAuthNav && auth.user ? (
            <UserMenu
              user={auth.user}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              logoutLabel={isLoggingOut ? t('header.loggingOut') : t('header.logout')}
              profileLabel={t('header.menu.profile')}
              profileHref="/dashboard/profile"
              isAdmin={showAdminNav}
              adminLabel={t('header.nav.admin')}
              adminHref="/admin"
              notificationsEnabled={notificationsEnabled}
              notificationBusy={notificationBusy}
              notificationLabel={notificationLabel}
              notificationButtonClass={notificationButtonClass}
              onToggleNotifications={handleToggleNotifications}
              sessionsLabel={t('header.menu.sessions')}
              sessionsHref="/dashboard/sessions"
            />
          ) : null}
        </div>
      </div>
      <MobileNavigationDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        navItems={availableNavItems}
        showInstallButton={showInstallButton}
        installLabel={isPromptingInstall ? pwaT('installingLabel') : t('header.installApp')}
        onInstallClick={handleInstallClick}
        isInstallLoading={isPromptingInstall}
        isAuthenticated={showAuthNav}
        userName={userDisplayName}
        userAvatar={userAvatar}
        onLogout={handleLogout}
        logoutLabel={isLoggingOut ? t('header.loggingOut') : t('header.logout')}
        profileHref="/dashboard/profile"
        profileLabel={t('header.menu.profile')}
        isAdmin={showAdminNav}
        adminLabel={t('header.nav.admin')}
        adminHref="/admin"
        ringBinderFolders={ringBinderFolders}
        ringBinderLoading={isRingBinderLoading}
        ringBinderError={isRingBinderError}
        ringBinderManageLabel={t('ringBinder.title')}
        ringBinderLoadingLabel={t('dashboard.filters.ringBinder.loading')}
        ringBinderEmptyLabel={t('ringBinder.list.emptyTitle')}
        ringBinderErrorLabel={t('ringBinder.list.error')}
        sessionsLabel={t('header.menu.sessions')}
        sessionsHref="/dashboard/sessions"
        menuTitle={t('header.mobileMenuTitle')}
        closeLabel={t('header.mobileMenuClose')}
        notificationsEnabled={notificationsEnabled}
        notificationBusy={notificationBusy}
        notificationLabel={notificationLabel}
        notificationButtonClass={notificationButtonClass}
        onToggleNotifications={handleToggleNotifications}
      />
      <MobileBottomNav
        pathname={pathname ?? ''}
        isAuthenticated={showAuthNav}
        homeLabel={t('header.nav.home')}
        dashboardLabel={t('header.nav.dashboard')}
        notificationsLabel={t('header.nav.notifications')}
        loginLabel={t('header.nav.login')}
        otherLabel={t('header.nav.other')}
        onOpenMenu={() => setMobileMenuOpen(true)}
        hasRecentNotifications={hasRecentNotifications}
      />
      <ManualInstallDialog open={showManualInstall} onOpenChange={setShowManualInstall} />
      <InstalledNoticeDialog
        open={showInstalledNotice}
        onOpenChange={setShowInstalledNotice}
        onOpenApp={() => {
          if (typeof window !== 'undefined') {
            window.open(window.location.origin, '_blank');
          }
        }}
      />
      <Dialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
        <DialogContent className="max-w-sm" hideCloseButton>
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="text-right">
              {notificationsT('all.confirmDisableTitle')}
            </DialogTitle>
            <DialogDescription className="text-right">
              {notificationsT('all.confirmDisableDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisableConfirmOpen(false)}
            >
              {notificationsT('all.confirmDisableCancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                await handleDisableNotifications();
                setDisableConfirmOpen(false);
              }}
              disabled={notificationBusy}
            >
              {notificationsT('all.confirmDisableAction')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}





type MobileNavigationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItemConfig[];
  showInstallButton: boolean;
  installLabel: string;
  onInstallClick: () => void;
  isInstallLoading: boolean;
  isAuthenticated: boolean;
  userName: string | null;
  userAvatar: string | null;
  isAdmin: boolean;
  adminLabel: string;
  adminHref: string;
  onLogout: () => Promise<void> | void;
  logoutLabel: string;
  profileHref: string;
  profileLabel: string;
  sessionsLabel: string;
  sessionsHref: string;
  menuTitle: string;
  closeLabel: string;
  ringBinderFolders: RingBinderFolder[];
  ringBinderLoading: boolean;
  ringBinderError: boolean;
  ringBinderManageLabel: string;
  ringBinderLoadingLabel: string;
  ringBinderEmptyLabel: string;
  ringBinderErrorLabel: string;
  notificationsEnabled: boolean;
  notificationBusy: boolean;
  notificationLabel: string;
  notificationButtonClass: string;
  onToggleNotifications: () => void;
};

function MobileNavigationDrawer({
  open,
  onOpenChange,
  navItems,
  showInstallButton,
  installLabel,
  onInstallClick,
  isInstallLoading,
  isAuthenticated,
  userName,
  userAvatar,
  isAdmin,
  adminLabel,
  adminHref,
  onLogout,
  logoutLabel,
  profileHref,
  profileLabel,
  sessionsLabel,
  sessionsHref,
  menuTitle,
  closeLabel,
  ringBinderFolders,
  ringBinderLoading,
  ringBinderError,
  ringBinderManageLabel,
  ringBinderLoadingLabel,
  ringBinderEmptyLabel,
  ringBinderErrorLabel,
  notificationsEnabled,
  notificationBusy,
  notificationLabel,
  notificationButtonClass,
  onToggleNotifications,
}: MobileNavigationDrawerProps) {
  const isBaleMiniApp = useAppSelector((s) => s.auth.isBaleMiniApp);
  const [ringBinderExpanded, setRingBinderExpanded] = useState(false);
  const maxLabelLength = 15;
  const truncateLabel = (name: string) =>
    name.length > maxLabelLength ? `${name.slice(0, maxLabelLength)}...` : name;
  const filteredNavItems = navItems.filter(
    (item) => item.key !== 'home' && item.key !== 'dashboard',
  );

  useEffect(() => {
    if (!open) {
      setRingBinderExpanded(false);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      {/* eslint-disable tailwindcss/classnames-order */}
      <DialogContent
        hideCloseButton
        className="left-auto right-0 top-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 bg-background p-0 text-foreground sm:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=open]:ease-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 data-[state=closed]:ease-in"
      >
        <DialogTitle className="sr-only">{menuTitle}</DialogTitle>
        <DialogDescription className="sr-only">{menuTitle}</DialogDescription>
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain border-l border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <p className="text-base font-semibold">{menuTitle}</p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label={closeLabel}
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>
          {isAuthenticated ? (
            <div className="border-b border-border/60 px-4 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href={profileHref}
                  className="flex flex-1 items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-secondary/60"
                  onClick={() => onOpenChange(false)}
                >
                  {userAvatar ? (
                    <Image
                      src={userAvatar}
                      alt={userName ?? profileLabel}
                      width={40}
                      height={40}
                      className="size-10 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-secondary/50 text-sm font-semibold text-foreground">
                      {(userName ?? profileLabel).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {userName ?? profileLabel}
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={notificationButtonClass}
                    onClick={() => void onToggleNotifications()}
                    aria-label={notificationLabel}
                    title={notificationLabel}
                    disabled={notificationBusy}
                  >
                    {notificationsEnabled ? (
                      <Bell className="size-4" aria-hidden />
                    ) : (
                      <BellOff className="size-4" aria-hidden />
                    )}
                  </Button>
                  <ThemeToggle className="shrink-0" />
                </div>
              </div>
              {isAdmin ? (
                <Link
                  href={adminHref}
                  className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  {renderNavIcon('admin', 'text-muted-foreground')}
                  <span>{adminLabel}</span>
                </Link>
              ) : null}
                <Link
                  href={sessionsHref}
                  className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  <Monitor className="size-4" aria-hidden />
                  <span>{sessionsLabel}</span>
                </Link>
            </div>
          ) : null}
          <nav className="flex flex-col gap-2 p-4">
            {[...filteredNavItems.filter((item) => item.visible)]
              .sort((a, b) => {
                if (a.key === 'login') return -1;
                if (b.key === 'login') return 1;
                return 0;
              })
              .map((item) => {
                if (item.key === 'ring-binder' && isAuthenticated) {
                  return (
                    <div key={item.key} className="space-y-1">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-foreground transition hover:border-border/70 hover:bg-secondary/60"
                        onClick={() => setRingBinderExpanded((prev) => !prev)}
                        aria-expanded={ringBinderExpanded}
                        aria-controls="ring-binder-submenu"
                      >
                        <span className="flex items-center gap-2">
                          {renderNavIcon(item.icon)}
                          {item.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            ringBinderExpanded ? 'rotate-180' : '',
                          )}
                          aria-hidden
                        />
                      </button>
                      {ringBinderExpanded ? (
                        <div
                          id="ring-binder-submenu"
                          className="rounded-lg border border-border/70 bg-muted/30 p-1"
                        >
                          <Link
                            href="/dashboard/ring-binder"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-secondary/60"
                            onClick={() => onOpenChange(false)}
                          >
                            {renderNavIcon('ringBinder')}
                            {ringBinderManageLabel}
                          </Link>
                          {ringBinderLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              {ringBinderLoadingLabel}
                            </div>
                          ) : ringBinderError ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              {ringBinderErrorLabel}
                            </div>
                          ) : ringBinderFolders.length > 0 ? (
                            ringBinderFolders.map((folder) => (
                              <Link
                                key={folder.id}
                                href={`/dashboard?ringFolderId=${encodeURIComponent(folder.id)}`}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-secondary/60"
                                onClick={() => onOpenChange(false)}
                                title={folder.name}
                              >
                                {renderNavIcon('ringBinder')}
                                {truncateLabel(folder.name)}
                              </Link>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              {ringBinderEmptyLabel}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-foreground transition hover:border-border/70 hover:bg-secondary/60"
                    onClick={() => onOpenChange(false)}
                  >
                    {renderNavIcon(item.icon)}
                    {item.label}
                  </Link>
                );
              })}
            {isAuthenticated ? (
              <div className="pt-2">
                <CodeSearch variant="mobile" onSuccess={() => onOpenChange(false)} />
              </div>
            ) : null}
          </nav>
          <div className="border-t border-border/60 p-4">
            {showInstallButton ? (
              <Button
                className="w-full border-0 bg-primary/90 text-right text-primary-foreground hover:bg-primary"
                onClick={() => {
                  onOpenChange(false);
                  onInstallClick();
                }}
                disabled={isInstallLoading}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <DownloadCloud className="size-4" aria-hidden />
                  {installLabel}
                </span>
              </Button>
            ) : null}
          </div>
          {isAuthenticated && !isBaleMiniApp ? (
            <div className="mt-auto border-t border-border/60 p-4">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  onOpenChange(false);
                  await onLogout();
                }}
              >
                <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <LogOut className="size-4" aria-hidden />
                  {logoutLabel}
                </span>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
      {/* eslint-enable tailwindcss/classnames-order */}
    </Dialog>
  );
}
