import { toGregorian } from 'jalaali-js';

function jalaaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  const isLeap =
    year % 33 === 1 ||
    year % 33 === 5 ||
    year % 33 === 9 ||
    year % 33 === 13 ||
    year % 33 === 17 ||
    year % 33 === 22 ||
    year % 33 === 26 ||
    year % 33 === 30;
  return isLeap ? 30 : 29;
}

export function getPersianQuarterDateRange(
  year: number,
  quarter: number,
): {
  startDate: Date;
  endDate: Date;
} {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;

  const start = toGregorian(year, startMonth, 1);
  const lastDay = jalaaliMonthLength(year, endMonth);
  const end = toGregorian(year, endMonth, lastDay);

  return {
    startDate: new Date(Date.UTC(start.gy, start.gm - 1, start.gd, 0, 0, 0, 0)),
    endDate: new Date(Date.UTC(end.gy, end.gm - 1, end.gd, 23, 59, 59, 999)),
  };
}
