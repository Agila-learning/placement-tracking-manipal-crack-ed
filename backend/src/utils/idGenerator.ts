import crypto from 'crypto';

/**
 * Generates an application number in the format:
 * FIC-YYYYMM-XXXX
 * where XXXX is a unique uppercase hex or sequential alphanumeric code
 */
export const generateApplicationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FIC-${year}${month}${day}-${randomSuffix}`;
};

