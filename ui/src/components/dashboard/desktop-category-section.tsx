import type { DivarCategory } from '@/types/divar-category';
import { CategoryBreadcrumb } from './category-breadcrumb';

type DesktopCategorySectionProps = {
  categorySlug: string | null;
  baseCategory?: DivarCategory | null;
  breadcrumbItems: { slug: string | null; depth: number | null; label: string }[];
  categoryOptions: DivarCategory[];
  isRTL: boolean;
  locale: string;
  categoriesBusy: boolean;
  title: string;
  loadingText: string;
  emptyText: string;
  onSelectCategory: (slug: string | null, depth: number | null) => void;
};

export function DesktopCategorySection({
  categorySlug,
  baseCategory: _baseCategory,
  breadcrumbItems,
  categoryOptions,
  isRTL,
  locale: _locale,
  categoriesBusy,
  title,
  loadingText,
  emptyText,
  onSelectCategory,
}: DesktopCategorySectionProps) {
  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <CategoryBreadcrumb
        breadcrumbItems={breadcrumbItems}
        categoryOptions={categoryOptions}
        categorySlug={categorySlug}
        isRTL={isRTL}
        onSelect={(slug, depth) => onSelectCategory(slug, depth ?? 0)}
      />
      {categoriesBusy ? (
        <p className="mt-2 text-xs text-muted-foreground">{loadingText}</p>
      ) : breadcrumbItems.length === 0 && categoryOptions.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{emptyText}</p>
      ) : null}
    </div>
  );
}
