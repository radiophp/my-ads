import type { BusinessBadge } from './business-badge';
import type { PostDetailData } from './post-detail-data';
import type { DivarPostSummary } from '@/types/divar-posts';

type PrintContentParams = {
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  post: DivarPostSummary;
  isRTL: boolean;
  contactInfo?: { ownerName?: string | null; phoneNumber?: string | null } | null;
  publishedDisplay?: string | null;
  cityDistrict?: string | null;
  businessBadge: BusinessBadge;
  categoryFilter?: { categoryName?: string } | null;
  combinedDetailEntries: Array<{ id: string; label: string; value: string | number | null }>;
  detailData: PostDetailData;
  AMENITY_CONFIG: Array<{ key: string; labelKey: string }>;
};

export function createPostPrintContent(params: PrintContentParams): string {
  const { t, post, isRTL, contactInfo, publishedDisplay, cityDistrict, businessBadge, categoryFilter, combinedDetailEntries, detailData, AMENITY_CONFIG } = params;

  const owner = contactInfo?.ownerName || post.ownerName || t('contactInfo.ownerUnknown');
  const phone = contactInfo?.phoneNumber ?? t('contactInfo.phoneUnknown');
  const published = publishedDisplay ?? t('shareMessagePublishUnknown');
  const location = cityDistrict ?? t('shareMessageLocationUnknown');

  const printLabels = {
    owner: t('contactInfo.ownerLabel'),
    phone: t('contactInfo.phoneLabel'),
    location: t('shareMessageLocationLabel'),
    publish: t('shareMessagePublishLabel'),
    title: t('shareMessageTitleLabel'),
    link: t('shareMessageLinkLabel'),
    category: t('shareMessageCategoryLabel'),
    business: t('shareMessageBusinessLabel'),
  };

  const categoryDisplay =
    categoryFilter?.categoryName ?? post.categoryName ?? post.categorySlug ?? t('labels.notAvailable');

  const coreSummary = [
    { label: printLabels.owner, value: owner },
    { label: printLabels.phone, value: phone },
    { label: printLabels.location, value: location },
    { label: printLabels.publish, value: published },
    { label: printLabels.title, value: '' },
    { label: printLabels.link, value: '' },
    {
      label: printLabels.category,
      value: categoryDisplay,
    },
    {
      label: printLabels.business,
      value: businessBadge?.label ?? t('businessType.unknown'),
    },
  ];

  const summaryTriples = [
    { label: t('labels.postCode'), value: post.code?.toString() ?? '' },
    { label: printLabels.category, value: categoryDisplay },
    coreSummary[0],
    coreSummary[1],
    coreSummary[2],
  ].filter((row) => row.value && row.value.toString().trim().length > 0);

  const summaryRows =
    summaryTriples.length > 0
      ? `<tr>
          ${summaryTriples
            .map(
              (row) =>
                `<td style="font-weight:700;background:#f3f4f6;">${row.label}</td>`,
            )
            .join('')}
        </tr>
        <tr>
          ${summaryTriples
            .map(
              (row) =>
                `<td>${row.value}</td>`,
            )
            .join('')}
        </tr>`
      : '';

  const detailPairs = combinedDetailEntries
    .filter((entry) => entry.value && entry.value.toString().trim().length > 0)
    .map((entry) => ({ label: entry.label, value: entry.value }));

  const detailRows = detailPairs.length
    ? detailPairs
        .reduce<string[]>((rows, pair, idx) => {
          if (idx % 3 === 0) rows.push('');
          const rowIdx = Math.floor(idx / 3);
          rows[rowIdx] += `<td style="font-weight:600;background:#fdfdfd;min-width:140px;">${pair.label}</td>
                           <td style="min-width:180px;">${pair.value}</td>`;
          return rows;
        }, [])
        .map((row) => `<tr>${row}</tr>`)
        .join('')
    : '';

  const amenityPairs = AMENITY_CONFIG.reduce<{ label: string; value: string }[]>((acc, config) => {
    const value = post[config.key as keyof typeof post];
    if (value === true) {
      acc.push({ label: t(config.labelKey), value: t('labels.booleanYes') });
    }
    return acc;
  }, []);

  const attributeRows =
    detailData.attributeValueEntries.length > 0 || amenityPairs.length > 0
      ? [...detailData.attributeValueEntries.map((attr) => ({ label: attr.label, value: attr.value })), ...amenityPairs]
          .reduce<string[]>((rows, pair, idx) => {
            if (idx % 3 === 0) rows.push('');
            const rowIdx = Math.floor(idx / 3);
            rows[rowIdx] += `<td style="padding:8px 10px;font-weight:600;border:1px solid #e5e7eb;background:#fdfdfd;min-width:140px;">${pair.label}</td>
                             <td style="padding:8px 10px;border:1px solid #e5e7eb;min-width:180px;">${pair.value}</td>`;
            return rows;
          }, [])
          .map((row) => `<tr>${row}</tr>`)
          .join('')
      : '';

  const labelOnlyLine =
    detailData.attributeLabelOnlyEntries.length > 0
      ? `<p style="margin-top:12px; margin-bottom:0; color:#111; line-height:1.6;">
           <span style="font-weight:700;">${t('labels.otherFeatures')}:</span>
           <span>${detailData.attributeLabelOnlyEntries.map((attr) => attr.label).join(' ، ')}</span>
         </p>`
      : '';

  return `
<!doctype html>
<html ${isRTL ? 'dir="rtl"' : ''}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${post.title ?? t('shareMessageTitleUnknown')}</title>
  <style>
    @font-face {
      font-family: 'IRANSans';
      src: url('/font/IRANSans/IRANSans%20Regular/IRANSans%20Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    body { font-family: 'IRANSans','Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif; margin: 20px; color: #111; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 6px; }
    h2 { margin-top: 14px; margin-bottom: 6px; font-size: 12px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; border:1px solid #e5e7eb; table-layout: fixed; }
    .print-table td { padding:8px; border:1px solid #e5e7eb; font-size: 12px; word-wrap: break-word; }
    .print-container { width:100%; max-width:1100px; margin:0 auto; }
    @page { size: A4 landscape; margin: 16mm; }
  </style>
</head>
<body>
  <div class="print-container">
    <h1>${post.title ?? ''}</h1>
    <table class="print-table">${summaryRows}</table>
    <table class="print-table">
      ${detailRows}
    </table>
    ${
      attributeRows
        ? `<table class="print-table" style="margin-top:12px;">${attributeRows}</table>`
        : ''
    }
    ${labelOnlyLine}
    ${
      post.description
        ? (() => {
            const flat: string = post.description!
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .join('. ');
            const normalized = flat.endsWith('.') ? flat : `${flat}.`;
            return `<div style="margin-top:16px;">
              <p style="margin:6px 0 0 0;line-height:1.6;">
                <span style="font-weight:700;">${t('shareMessageDescriptionLabel')}:</span>
                <span style="margin-${isRTL ? 'right' : 'left'}:6px;">${normalized}</span>
              </p>
            </div>`;
          })()
        : ''
    }
  </div>
</body>
</html>`;
}
