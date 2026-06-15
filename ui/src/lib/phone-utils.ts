export const CODE_LENGTH = 4;

export const sanitizeIranLocalPhone = (input: string): string => {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0098')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('098')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('98')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

export const formatPhoneInput = (input: string): string => {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0098')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('098')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('98') && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

export const isValidIranLocalPhone = (digits: string): boolean => /^9\d{9}$/.test(digits);

export const toInternationalIranPhone = (digits: string): string =>
  digits ? `+98${digits}` : '';

export const formatDisplayIranPhone = (digits: string): string => `0${digits}`;

export const sanitizeCode = (input: string) => input.replace(/\D/g, '').slice(0, CODE_LENGTH);
