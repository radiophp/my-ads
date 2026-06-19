const QUARTER_NAMES: Record<number, string> = {
  1: 'بهار',
  2: 'تابستان',
  3: 'پاییز',
  4: 'زمستان',
};

function getCurrentPersianYearAndQuarter(): { year: number; quarter: number } {
  const now = new Date();
  const gy = now.getFullYear();
  const march20 = new Date(gy, 2, 20).getTime();

  const year = now.getTime() >= march20 ? gy - 621 : gy - 622;

  const month = now.getMonth();
  let quarter: number;
  if (month >= 3 && month <= 5) quarter = 1;
  else if (month >= 6 && month <= 8) quarter = 2;
  else if (month >= 9 && month <= 11) quarter = 3;
  else quarter = 4;

  return { year, quarter };
}

function formatPersianNumber(num: number): string {
  try {
    return new Intl.NumberFormat('fa', { useGrouping: false }).format(num);
  } catch {
    return String(num);
  }
}

export function formatQuarterLabel(year: number, quarter: number): string {
  return `${QUARTER_NAMES[quarter]} ${formatPersianNumber(year)}`;
}

export type QuarterOption = {
  value: string;
  label: string;
};

export function generateQuarterOptions(): QuarterOption[] {
  const current = getCurrentPersianYearAndQuarter();
  const options: QuarterOption[] = [];

  for (let year = current.year; year >= 1399; year--) {
    const startQuarter = year === current.year ? current.quarter : 4;
    const endQuarter = year === 1399 ? 1 : 1;

    for (let q = startQuarter; q >= endQuarter; q--) {
      options.push({
        value: `${year}-${q}`,
        label: formatQuarterLabel(year, q),
      });
    }
  }

  return options;
}

export const DEFAULT_QUARTER_VALUE = '';

export function getCurrentQuarterValue(): string {
  const { year, quarter } = getCurrentPersianYearAndQuarter();
  return `${year}-${quarter}`;
}
