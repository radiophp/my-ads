import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { fetchSeoSetting } from '@/lib/server/seo';
import { fetchWebsiteSettings } from '@/lib/server/website-settings';
import { FooterDistrictTabs } from '@/components/layout/footer-district-tabs';

type FooterTranslations = Awaited<ReturnType<typeof getTranslations>>;

type ProvinceDto = {
  id: number;
  name: string;
  slug: string;
};

type CityDto = {
  id: number;
  name: string;
  slug: string;
  provinceId: number;
};

type DistrictDto = {
  id: number;
  name: string;
  slug: string;
  city: string;
  cityId: number;
  citySlug: string;
  provinceId: number;
  provinceSlug: string;
};

type FooterDistrictGroup = {
  city: string;
  cityId?: number;
  citySlug?: string;
  provinceId?: number;
  items: Array<{
    id: number;
    name: string;
    cityId?: number;
    citySlug?: string;
    provinceId?: number;
    districtId?: number;
    districtSlug?: string;
  }>;
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const resolveApiBase = async (): Promise<string> => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeBaseUrl(envBase);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${normalizeBaseUrl(appUrl)}/api`;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}/api`;

  return '';
};

const fetchAlborzLocations = async (): Promise<{
  cities: CityDto[];
  districts: DistrictDto[];
}> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) return { cities: [], districts: [] };

  try {
    const provincesResponse = await fetch(`${apiBase}/provinces`, {
      next: { revalidate: 600 },
    });
    if (!provincesResponse.ok) return { cities: [], districts: [] };
    const provinces = (await provincesResponse.json()) as ProvinceDto[];
    const alborz = provinces.find(
      (province) =>
        province.slug?.toLowerCase() === 'alborz-province' || province.name === 'البرز',
    );
    if (!alborz) return { cities: [], districts: [] };

    const citiesResponse = await fetch(`${apiBase}/cities?provinceId=${alborz.id}`, {
      next: { revalidate: 600 },
    });
    const cities = citiesResponse.ok ? ((await citiesResponse.json()) as CityDto[]) : [];

    const districtsResponse = await fetch(`${apiBase}/districts?provinceId=${alborz.id}`, {
      next: { revalidate: 600 },
    });
    const districts = districtsResponse.ok ? ((await districtsResponse.json()) as DistrictDto[]) : [];

    return {
      cities,
      districts: districts.filter((district) => district.city),
    };
  } catch {
    return { cities: [], districts: [] };
  }
};

function FooterIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FooterLinks({ t }: { t: FooterTranslations }) {
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{t('linksTitle')}</p>
      <ul className="space-y-2 text-sm">
        <li>
          <Link href="/news" className="cursor-pointer transition hover:text-foreground">
            {t('newsLink')}
          </Link>
        </li>
        <li>
          <Link href="/blog" className="cursor-pointer transition hover:text-foreground">
            {t('blogLink')}
          </Link>
        </li>
      </ul>
    </div>
  );
}

function FooterContact({
  t,
  phoneContacts,
  address,
  instagramUrl,
  telegramChannelUrl,
  telegramBotUrl,
}: {
  t: FooterTranslations;
  phoneContacts: Array<{ name: string; phone: string }>;
  address: string;
  instagramUrl: string;
  telegramChannelUrl: string;
  telegramBotUrl: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{t('contactTitle')}</p>
      <div className="space-y-2 text-sm">
        {phoneContacts.length > 0 ? (
          <div className="space-y-1">
            {phoneContacts.map((contact) => (
              <div key={`${contact.name}-${contact.phone}`} className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-foreground">{contact.name}</span>
                <span className="text-muted-foreground">•</span>
                <a href={`tel:${contact.phone}`} className="transition hover:text-foreground">
                  {contact.phone}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t('contactEmpty')}</p>
        )}
        {address ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span>{address}</span>
          </div>
        ) : null}
        {(instagramUrl || telegramChannelUrl || telegramBotUrl) ? (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-foreground"
              >
                <Instagram className="size-4" aria-hidden />
                {t('instagram')}
              </a>
            ) : null}
            {telegramChannelUrl ? (
              <a
                href={telegramChannelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-foreground"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t('telegramChannel')}
              </a>
            ) : null}
            {telegramBotUrl ? (
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-foreground"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t('telegramBot')}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FooterDistricts({
  t,
  groups,
}: {
  t: FooterTranslations;
  groups: FooterDistrictGroup[];
}) {
  return (
    <div className="hidden border-t border-border/60 pt-6 md:block">
      <p className="text-base font-semibold text-foreground">{t('districtsTitle')}</p>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('districtsEmpty')}</p>
      ) : (
        <FooterDistrictTabs groups={groups} emptyLabel={t('districtsEmpty')} defaultCity="کرج" />
      )}
    </div>
  );
}

function FooterMainRow({
  footerTitle,
  footerDescription,
  t,
  phoneContacts,
  address,
  instagramUrl,
  telegramChannelUrl,
  telegramBotUrl,
}: {
  footerTitle: string;
  footerDescription: string;
  t: FooterTranslations;
  phoneContacts: Array<{ name: string; phone: string }>;
  address: string;
  instagramUrl: string;
  telegramChannelUrl: string;
  telegramBotUrl: string;
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <FooterIntro title={footerTitle} description={footerDescription} />
      <FooterLinks t={t} />
      <FooterContact
        t={t}
        phoneContacts={phoneContacts}
        address={address}
        instagramUrl={instagramUrl}
        telegramChannelUrl={telegramChannelUrl}
        telegramBotUrl={telegramBotUrl}
      />
    </div>
  );
}

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  const [seoSetting, settings, locations] = await Promise.all([
    fetchSeoSetting('home'),
    fetchWebsiteSettings(),
    fetchAlborzLocations(),
  ]);
  const footerTitle = seoSetting?.title?.trim() || t('defaultTitle');
  const footerDescription = seoSetting?.description?.trim() || t('defaultDescription');
  const phoneContacts = settings?.phoneContacts?.filter((item) => item.phone.trim().length > 0) ?? [];
  const instagramUrl = settings?.instagramUrl?.trim() || '';
  const telegramChannelUrl = settings?.telegramChannelUrl?.trim() || '';
  const telegramBotUrl = settings?.telegramBotUrl?.trim() || '';
  const address = settings?.address?.trim() || '';
  const districtMap = locations.districts.reduce<Record<number, DistrictDto[]>>((acc, district) => {
    acc[district.cityId] = acc[district.cityId] ?? [];
    acc[district.cityId].push(district);
    return acc;
  }, {});
  const citiesWithDistricts = locations.cities.filter(
    (city) => (districtMap[city.id] ?? []).length > 0,
  );
  const citiesWithoutDistricts = locations.cities.filter(
    (city) => (districtMap[city.id] ?? []).length === 0,
  );
  const allCityItems = locations.cities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
    .map((city) => ({
      id: city.id,
      name: city.name,
      cityId: city.id,
      citySlug: city.slug,
      provinceId: city.provinceId,
    }));
  const districtGroups: FooterDistrictGroup[] = citiesWithDistricts.map((city) => ({
    city: city.name,
    cityId: city.id,
    citySlug: city.slug,
    provinceId: city.provinceId,
    items: (districtMap[city.id] ?? []).map((district) => ({
      id: district.id,
      name: district.name,
      cityId: district.cityId,
      citySlug: district.citySlug,
      provinceId: district.provinceId,
      districtId: district.id,
      districtSlug: district.slug,
    })),
  }));
  districtGroups.sort((a, b) => {
    if (a.city === 'کرج') return -1;
    if (b.city === 'کرج') return 1;
    return a.city.localeCompare(b.city, 'fa');
  });
  if (allCityItems.length > 0) {
    districtGroups.unshift({
      city: t('allCitiesTab'),
      items: allCityItems,
    });
  }
  if (citiesWithoutDistricts.length > 0) {
    const otherCityItems = citiesWithoutDistricts.map((city, index) => ({
      id: -(index + 1),
      name: city.name,
      cityId: city.id,
      citySlug: city.slug,
      provinceId: city.provinceId,
    }));
    districtGroups.push({
      city: t('otherCitiesTab'),
      items: otherCityItems,
    });
  }

  return (
    <footer
      data-site-footer
      className="border-t border-border/60 bg-background/70 text-sm text-muted-foreground transition-colors"
    >
      <div className="flex w-full flex-col gap-10 px-4 py-12 lg:px-10">
        <FooterDistricts t={t} groups={districtGroups} />
        <FooterMainRow
          footerTitle={footerTitle}
          footerDescription={footerDescription}
          t={t}
          phoneContacts={phoneContacts}
          address={address}
          instagramUrl={instagramUrl}
          telegramChannelUrl={telegramChannelUrl}
          telegramBotUrl={telegramBotUrl}
        />
        <div className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  );
}
