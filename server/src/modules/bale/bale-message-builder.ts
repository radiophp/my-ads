export function buildDashboardPostUrl(appBaseUrl: string, postId: string): string | null {
  if (!appBaseUrl) {
    return null;
  }
  return `${appBaseUrl}/dashboard/posts/${postId}`;
}

export function buildBaleDeepLink(botUsername: string, postId: string): string {
  return `https://ble.ir/${botUsername}?startapp=post_${postId}`;
}

export function formatPriceLine(post: Record<string, unknown>): string | null {
  const fmt = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num.toLocaleString('fa-IR');
  };

  const price = fmt(post['priceTotal']);
  const deposit = fmt(post['depositAmount']);
  const rent = fmt(post['rentAmount']);

  if (price) return `💰 قیمت: ${price} تومان`;
  if (deposit || rent) {
    const parts = [];
    if (deposit) parts.push(`ودیعه ${deposit}`);
    if (rent) parts.push(`اجاره ${rent}`);
    return `💰 ${parts.join(' / ')} تومان`;
  }
  return null;
}

export function buildCaption(
  post: Record<string, unknown>,
  appBaseUrl: string,
  customMessage?: string,
  baleBotUsername?: string,
): string {
  const url =
    (post['shareUrl'] as string) ||
    (post['permalink'] as string) ||
    (post['externalId'] ? `https://divar.ir/v/${post['externalId']}` : '');
  const title = (post['title'] || post['shareTitle'] || post['displayTitle'] || 'آگهی') as string;
  const lines: string[] = [];
  if (customMessage) lines.push(customMessage);
  lines.push(`📌 ${title}`);
  if (post['code']) {
    lines.push(`🆔 کد آگهی: ${post['code']}`);
  }
  const postId = post['id'] as string;
  const link = baleBotUsername
    ? buildBaleDeepLink(baleBotUsername, postId)
    : buildDashboardPostUrl(appBaseUrl, postId);
  if (link) {
    lines.push(`🔗 ${link}`);
  }

  if (post['cityName'] || post['districtName'] || post['provinceName']) {
    const loc = [post['provinceName'], post['cityName'], post['districtName']]
      .filter(Boolean)
      .join('، ');
    if (loc) lines.push(`📍 ${loc}`);
  }

  const priceLine = formatPriceLine(post);
  if (priceLine) lines.push(priceLine);

  const facts: string[] = [];
  if (post['area']) facts.push(`متراژ ${post['area']}`);
  if (post['rooms']) facts.push(`اتاق ${post['rooms']}`);
  if (post['floor']) facts.push(`طبقه ${post['floor']}`);
  if (post['yearBuilt']) facts.push(`سال ساخت ${post['yearBuilt']}`);
  if (post['businessType']) {
    const business = post['businessType'] === 'personal' ? 'شخصی' : 'املاک';
    facts.push(business);
  }
  if (facts.length) lines.push(`ℹ️ ${facts.join(' • ')}`);

  if (post['phoneNumber']) lines.push(`☎️ ${post['phoneNumber']}`);
  if (url) lines.push(url);

  if (post['description']) {
    const desc =
      (post['description'] as string).length > 900
        ? `${(post['description'] as string).slice(0, 900).trimEnd()}…`
        : (post['description'] as string);
    lines.push('');
    lines.push(desc);
  }

  const caption = lines.join('\n');
  return caption.length > 1000 ? `${caption.slice(0, 1000).trimEnd()}…` : caption;
}
