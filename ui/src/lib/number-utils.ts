export function formatDelimited(value: string): string {
  const parts = value.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let result = '';
  if (h > 0) result += HUNDREDS[h];
  const remainder = n % 100;
  if (remainder === 0) return result;
  if (result) result += ' و ';
  if (remainder < 10) {
    result += ONES[remainder];
  } else if (remainder < 20) {
    result += TEENS[remainder - 10];
  } else {
    if (t > 0) result += TENS[t];
    if (o > 0) result += ' و ' + ONES[o];
  }
  return result;
}

export function numberToPersianWords(num: number): string {
  if (num === 0) return 'صفر';
  const groups: string[] = [];
  const GRADES = ['', 'هزار', 'میلیون', 'میلیارد'];
  let remaining = Math.floor(num);
  let grade = 0;
  while (remaining > 0) {
    const part = remaining % 1000;
    if (part > 0) {
      const words = threeDigitWords(part);
      groups.unshift(words + (GRADES[grade] ? ' ' + GRADES[grade] : ''));
    }
    remaining = Math.floor(remaining / 1000);
    grade++;
  }
  return groups.join(' و ');
}
