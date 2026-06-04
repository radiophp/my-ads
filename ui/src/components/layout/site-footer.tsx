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
      <p className="text-xs leading-[1.9] text-muted-foreground">{description}</p>
    </div>
  );
}

function FooterLinks({ t }: { t: FooterTranslations }) {
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{t('linksTitle')}</p>
      <ul className="space-y-2 text-xs leading-loose">
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
        <li>
          <Link href="/about" className="cursor-pointer transition hover:text-foreground">
            {t('aboutLink')}
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
  baleBotUrl,
}: {
  t: FooterTranslations;
  phoneContacts: Array<{ name: string; phone: string }>;
  address: string;
  instagramUrl: string;
  telegramChannelUrl: string;
  telegramBotUrl: string;
  baleBotUrl: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{t('contactTitle')}</p>
      <div className="space-y-2 text-xs leading-loose">
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
          <div className="flex items-start gap-2 text-xs leading-loose text-muted-foreground">
            <MapPin className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
            <span>{address}</span>
          </div>
        ) : null}
        {(instagramUrl || telegramChannelUrl || telegramBotUrl || baleBotUrl) ? (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs leading-loose">
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
            {baleBotUrl ? (
              <a
                href={baleBotUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-foreground"
              >
                <svg fill="currentColor" viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path d="M11.425 23.987a12.218 12.218 0 0 1-2.95-.514 6.578 6.578 0 0 0-.336-.116C4.936 22.303 2.22 19.763.913 16.599a11.92 11.92 0 0 1-.9-4.063C.005 12.377.001 10.246 0 6.74 0 .71-.005 1.137.07.903.23.394.673.05 1.224.005c.421-.034.7.088 1.603.699.562.38 1.119.78 1.796 1.289.315.237.353.261.376.247l.35-.23c.58-.381 1.11-.677 1.7-.945A11.913 11.913 0 0 1 9.766.21a11.19 11.19 0 0 1 2.041-.2c1.14-.016 2.077.091 3.152.36 3.55.888 6.538 3.411 8.028 6.78.492 1.113.845 2.43.945 3.522.033.366.039.43.053.611.008.105.015.406.015.669 0 .783-.065 1.57-.169 2.064a5.474 5.474 0 0 0-.046.26c-.056.378-.214.987-.399 1.535-.205.613-.367.999-.684 1.633a11.95 11.95 0 0 1-2.623 3.436c-.44.396-.829.705-1.26 1.003-.647.445-1.307.812-2.039 1.134-.6.265-1.44.539-2.101.686a11.165 11.165 0 0 1-1.178.202 12.28 12.28 0 0 1-2.076.082zm-.61-5.92c.294-.06.678-.209.864-.337.144-.099.428-.376 2.064-2.013a161.8 161.8 0 0 1 1.764-1.753c.017 0 1.687-1.67 1.687-1.689 0-.02 1.64-1.648 1.661-1.648.01 0 .063-.047.118-.106.467-.495.682-.957.716-1.547.026-.433-.06-.909-.217-1.196a2.552 2.552 0 0 0-.983-1.024c-.281-.163-.512-.233-.888-.27-.306-.031-.688 0-.948.075-.243.07-.603.274-.853.481-.042.035-1.279 1.265-2.748 2.733l-2.671 2.67-1.093-1.09c-.6-.6-1.12-1.114-1.155-1.142a2.419 2.419 0 0 0-1.338-.51c-.404-.013-.91.09-1.224.25a2.89 2.89 0 0 0-.659.526c-.108.12-.287.357-.29.385-.003.03-.009.044-.065.16a2.312 2.312 0 0 0-.224.91c-.011.229-.01.265.019.491.045.353.24.781.51 1.115.05.063.97.992 2.044 2.064 1.507 1.505 1.98 1.97 2.074 2.039.327.24.683.388 1.101.456.182.03.5.016.734-.03z"/>
                </svg>
                {t('baleBot')}
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
  baleBotUrl,
}: {
  footerTitle: string;
  footerDescription: string;
  t: FooterTranslations;
  phoneContacts: Array<{ name: string; phone: string }>;
  address: string;
  instagramUrl: string;
  telegramChannelUrl: string;
  telegramBotUrl: string;
  baleBotUrl: string;
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
        baleBotUrl={baleBotUrl}
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
  const baleBotUrl = settings?.baleBotUrl?.trim() || '';
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
          baleBotUrl={baleBotUrl}
        />
        <div className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  );
}
