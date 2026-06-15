import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryBreadcrumb } from '@/components/dashboard/category-breadcrumb';
import type { DivarCategory } from '@/types/divar-category';

const mockOptions: DivarCategory[] = [
  { id: '1', slug: 'buy-apartment', name: 'خرید آپارتمان', depth: 1, parentSlug: null, allowPosting: true, displayPath: '', path: '', parentId: null, parentName: null, position: 0, childrenCount: 0, isActive: true, createdAt: '', updatedAt: '' },
  { id: '2', slug: 'buy-villa', name: 'خرید ویلا', depth: 1, parentSlug: null, allowPosting: true, displayPath: '', path: '', parentId: null, parentName: null, position: 0, childrenCount: 0, isActive: true, createdAt: '', updatedAt: '' },
];

const mockBreadcrumb = [
  { slug: null, label: 'همه', depth: null },
  { slug: 'real-estate', label: 'املاک', depth: 0 },
  { slug: 'buy-apartment', label: 'خرید آپارتمان', depth: 1 },
];

describe('CategoryBreadcrumb', () => {
  it('renders breadcrumb items', () => {
    render(
      <CategoryBreadcrumb
        breadcrumbItems={mockBreadcrumb}
        categoryOptions={mockOptions}
        categorySlug={null}
        isRTL={true}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('همه')).toBeInTheDocument();
    expect(screen.getByText('املاک')).toBeInTheDocument();
    const matches = screen.getAllByText('خرید آپارتمان');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders category options', () => {
    render(
      <CategoryBreadcrumb
        breadcrumbItems={[]}
        categoryOptions={mockOptions}
        categorySlug={null}
        isRTL={true}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('خرید آپارتمان')).toBeInTheDocument();
    expect(screen.getByText('خرید ویلا')).toBeInTheDocument();
  });

  it('highlights active category option', () => {
    render(
      <CategoryBreadcrumb
        breadcrumbItems={[]}
        categoryOptions={mockOptions}
        categorySlug="buy-apartment"
        isRTL={true}
        onSelect={() => {}}
      />,
    );
    const activeButton = screen.getByRole('button', { name: /خرید آپارتمان/ });
    expect(activeButton.className).toContain('text-primary');
  });

  it('fires onSelect when clicking a breadcrumb item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryBreadcrumb
        breadcrumbItems={mockBreadcrumb}
        categoryOptions={[]}
        categorySlug={null}
        isRTL={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText('املاک'));
    expect(onSelect).toHaveBeenCalledWith('real-estate', 0);
  });

  it('fires onSelect when clicking a category option', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryBreadcrumb
        breadcrumbItems={[]}
        categoryOptions={mockOptions}
        categorySlug={null}
        isRTL={false}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByText('خرید آپارتمان'));
    expect(onSelect).toHaveBeenCalledWith('buy-apartment', 1);
  });

  it('renders at least one separator between breadcrumb items', () => {
    const { container } = render(
      <CategoryBreadcrumb
        breadcrumbItems={mockBreadcrumb}
        categoryOptions={[]}
        categorySlug={null}
        isRTL={true}
        onSelect={() => {}}
      />,
    );
    const separators = container.querySelectorAll('span');
    const found = Array.from(separators).filter((el) => el.textContent === '«');
    expect(found.length).toBeGreaterThanOrEqual(1);
  });
});
