import type { JSX } from 'react';
import { useState } from 'react';
import type { useTranslations } from 'next-intl';
import type { DivarPostSummary } from '@/types/divar-posts';
import { PostMediaCarousel } from './post-media-carousel';
import { AmenitiesSection, AttributeLabelGrid, AttributeValueGrid } from './post-detail-sections';
import type { BusinessBadge } from './business-badge';
import type { PostDetailData } from './post-detail-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FaTelegramPlane, FaWhatsapp, FaSms, FaRegCopy } from 'react-icons/fa';
import { Share2 } from 'lucide-react';

export type PostDetailViewProps = {
  post: DivarPostSummary;
  t: ReturnType<typeof useTranslations>;
  isRTL: boolean;
  businessBadge: BusinessBadge;
  cityDistrict: string | null;
  publishedDisplay: string | null;
  hasDownloadableMedia: boolean;
  onRequestDownload: () => void;
  detailData: PostDetailData;
  onShareWhatsapp?: () => void;
  onShareTelegram?: () => void;
  smsHref?: string | null;
  onCopyLink?: () => void;
  copyLinkLabel?: string;
};

export function PostDetailView({
  post,
  t,
  isRTL,
  businessBadge,
  cityDistrict,
  publishedDisplay,
  hasDownloadableMedia,
  onRequestDownload,
  detailData,
  onShareWhatsapp,
  onShareTelegram,
  smsHref,
  onCopyLink,
  copyLinkLabel,
}: PostDetailViewProps): JSX.Element {
  const combinedDetailEntries = [
    ...detailData.featuredDetailEntries,
    ...detailData.infoRowEntries,
    ...detailData.secondaryDetailEntries,
  ];
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="order-2 flex-1 space-y-6 lg:order-1">
          {onShareWhatsapp || onShareTelegram || smsHref || onCopyLink ? (
            <>
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-1 text-xs"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="size-3.5" />
                  <span>{t('sharePost')}</span>
                </Button>
              </div>
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent
                  className="max-w-sm"
                  hideCloseButton={false}
                >
                  <DialogHeader>
                    <DialogTitle>{t('sharePost')}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    {onShareWhatsapp ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          onShareWhatsapp();
                          setShareDialogOpen(false);
                        }}
                      >
                        <FaWhatsapp className="text-green-600" />
                        <span>{t('shareWhatsApp')}</span>
                      </Button>
                    ) : null}
                    {onShareTelegram ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          onShareTelegram();
                          setShareDialogOpen(false);
                        }}
                      >
                        <FaTelegramPlane className="text-sky-500" />
                        <span>{t('shareTelegram')}</span>
                      </Button>
                    ) : null}
                    {smsHref ? (
                      <Button
                        asChild
                        variant="outline"
                        className="flex items-center gap-2 sm:hidden"
                      >
                        <a href={smsHref} onClick={() => setShareDialogOpen(false)}>
                          <FaSms className="text-primary" />
                          <span>{t('shareSms')}</span>
                        </a>
                      </Button>
                    ) : null}
                    {onCopyLink ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => {
                          onCopyLink();
                          setShareDialogOpen(false);
                        }}
                      >
                        <FaRegCopy />
                        <span>{copyLinkLabel ?? t('copyLink')}</span>
                      </Button>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
          {combinedDetailEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {combinedDetailEntries.map((entry) => (
                <div
                  key={entry.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 p-3 text-center shadow-sm"
                >
                  <span className="text-xs text-muted-foreground">{entry.label}</span>
                  <span className="text-sm font-semibold text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <AmenitiesSection post={post} t={t} />
          <dl className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {detailData.descriptionLines ? (
              <div className="col-span-full space-y-1">
                <dt className="font-medium text-foreground">{t('labels.description')}</dt>
                <dd
                  className="text-sm text-muted-foreground"
                  style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', lineHeight: '2' }}
                >
                  {detailData.descriptionLines.map((line, index) => (
                    <span
                      key={`description-line-${index}`}
                      style={{ wordBreak: 'break-all' }}
                    >
                      {line || '\u00A0'}
                      {index < detailData.descriptionLines!.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            <AttributeValueGrid entries={detailData.attributeValueEntries} />
            <AttributeLabelGrid entries={detailData.attributeLabelOnlyEntries} />
          </dl>
        </div>
        <div className="order-1 lg:order-2 lg:w-2/5">
          <PostMediaCarousel
            post={post}
            isRTL={isRTL}
            businessBadge={businessBadge}
            cityDistrict={cityDistrict}
            publishedDisplay={publishedDisplay}
            hasDownloadableMedia={hasDownloadableMedia}
            onRequestDownload={onRequestDownload}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
